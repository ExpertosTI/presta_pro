require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch (err) {
    console.error('JWT error', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

app.post('/api/tenants/register', async (req, res) => {
  const { tenantName, tenantSlug, adminEmail, adminPassword } = req.body;
  if (!tenantName || !tenantSlug || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        users: {
          create: {
            email: adminEmail,
            passwordHash,
            name: 'Administrador',
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const adminUser = tenant.users[0];

    const token = jwt.sign(
      { userId: adminUser.id, tenantId: tenant.id, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    });
  } catch (err) {
    console.error('TENANT_REGISTER_ERROR', err);
    return res.status(500).json({
      error: 'Error interno al registrar el tenant',
      code: err.code || null,
      message: err.message || null,
    });
  }
});

app.put('/api/loans/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { amount, rate, term, frequency, startDate } = req.body;

  if (!amount || !rate || !term || !frequency || !startDate) {
    return res.status(400).json({ error: 'Faltan campos requeridos para editar el préstamo' });
  }

  try {
    const existing = await prisma.loan.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { installments: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const hasPayments = existing.installments.some((inst) => inst.status === 'PAID');
    if (hasPayments) {
      return res.status(400).json({ error: 'No se puede editar un préstamo con pagos registrados' });
    }

    const schedule = calculateSchedule(amount, rate, term, frequency, startDate);
    const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.loanInstallment.deleteMany({ where: { loanId: existing.id } });

      const loan = await tx.loan.update({
        where: { id: existing.id },
        data: {
          amount: parseFloat(amount),
          rate: parseFloat(rate),
          term: parseInt(term, 10),
          frequency,
          startDate: new Date(startDate),
          totalInterest,
          totalPaid: 0,
          status: 'ACTIVE',
          installments: {
            create: schedule.map((s) => ({
              number: s.number,
              date: s.date,
              payment: s.payment,
              interest: s.interest,
              principal: s.principal,
              balance: s.balance,
            })),
          },
        },
        include: { installments: true, client: true },
      });

      return loan;
    });

    return res.json(mapLoanToResponse(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar préstamo' });
  }
});

// --- Collectors ---

app.get('/api/collectors', authMiddleware, async (req, res) => {
  try {
    const collectors = await prisma.collector.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(collectors);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener cobradores' });
  }
});

app.post('/api/collectors', authMiddleware, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nombre del cobrador es requerido' });
  }
  try {
    const collector = await prisma.collector.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        tenantId: req.user.tenantId,
      },
    });
    return res.status(201).json(collector);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear cobrador' });
  }
});

app.put('/api/collectors/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  try {
    const existing = await prisma.collector.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }
    const updated = await prisma.collector.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        phone: phone !== undefined ? phone : existing.phone,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar cobrador' });
  }
});

app.delete('/api/collectors/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.collector.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    await prisma.collector.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar cobrador' });
  }
});

// --- Clients ---

app.get('/api/clients', authMiddleware, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { tenantId: req.user.tenantId },
      include: { collector: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(clients);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/clients', authMiddleware, async (req, res) => {
  const { name, phone, address, idNumber, email, collectorId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  }

  try {
    let validCollectorId = null;
    if (collectorId) {
      const collector = await prisma.collector.findFirst({ where: { id: collectorId, tenantId: req.user.tenantId } });
      if (!collector) {
        return res.status(400).json({ error: 'Cobrador inválido para este tenant' });
      }
      validCollectorId = collector.id;
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        address: address || null,
        idNumber: idNumber || null,
        email: email || null,
        score: 70,
        collectorId: validCollectorId,
        tenantId: req.user.tenantId,
      },
    });
    return res.status(201).json(client);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear cliente' });
  }
});

app.put('/api/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, idNumber, email, score, collectorId } = req.body;

  try {
    const existing = await prisma.client.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    let validCollectorId = existing.collectorId;
    if (collectorId !== undefined) {
      if (!collectorId) {
        validCollectorId = null;
      } else {
        const collector = await prisma.collector.findFirst({ where: { id: collectorId, tenantId: req.user.tenantId } });
        if (!collector) {
          return res.status(400).json({ error: 'Cobrador inválido para este tenant' });
        }
        validCollectorId = collector.id;
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        idNumber: idNumber !== undefined ? idNumber : existing.idNumber,
        email: email !== undefined ? email : existing.email,
        collectorId: validCollectorId,
        score: typeof score === 'number' ? score : existing.score,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.delete('/api/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.client.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await prisma.client.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// --- Loans ---

function calculateSchedule(amount, rate, term, frequency, startDate) {
  const schedule = [];
  const principalAmount = parseFloat(amount) || 0;
  let balance = principalAmount;
  const annualRate = (parseFloat(rate) || 0) / 100;
  const totalTerms = parseInt(term, 10) || 0;

  let periodsPerYear = 12;
  let daysPerPeriod = 30;

  switch (frequency) {
    case 'Diario':
      periodsPerYear = 365;
      daysPerPeriod = 1;
      break;
    case 'Semanal':
      periodsPerYear = 52;
      daysPerPeriod = 7;
      break;
    case 'Quincenal':
      periodsPerYear = 24;
      daysPerPeriod = 15;
      break;
    case 'Mensual':
      periodsPerYear = 12;
      daysPerPeriod = 30;
      break;
    default:
      periodsPerYear = 12;
  }

  if (!principalAmount || !totalTerms) return [];

  const ratePerPeriod = annualRate / periodsPerYear;
  let pmt = 0;

  if (ratePerPeriod === 0) {
    pmt = principalAmount / totalTerms;
  } else {
    pmt = (principalAmount * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -totalTerms));
  }

  pmt = parseFloat(pmt.toFixed(2));

  let currentDate = new Date(startDate);

  for (let i = 1; i <= totalTerms; i++) {
    const rawInterest = balance * ratePerPeriod;
    const interest = parseFloat(rawInterest.toFixed(2));
    const principal = parseFloat((pmt - interest).toFixed(2));
    balance = parseFloat((balance - principal).toFixed(2));
    if (balance < 0) balance = 0;

    currentDate.setDate(currentDate.getDate() + daysPerPeriod);

    schedule.push({
      number: i,
      date: new Date(currentDate),
      payment: pmt,
      interest,
      principal,
      balance,
    });
  }

  return schedule;
}

function mapLoanToResponse(loanWithRelations) {
  const { installments, client, ...loan } = loanWithRelations;
  return {
    id: loan.id,
    clientId: loan.clientId,
    clientName: client ? client.name : undefined,
    amount: loan.amount,
    rate: loan.rate,
    term: loan.term,
    frequency: loan.frequency,
    status: loan.status,
    totalInterest: loan.totalInterest,
    totalPaid: loan.totalPaid,
    startDate: loan.startDate,
    createdAt: loan.createdAt,
    schedule: installments
      .sort((a, b) => a.number - b.number)
      .map((inst) => ({
        id: inst.id,
        number: inst.number,
        date: inst.date.toISOString().split('T')[0],
        payment: inst.payment,
        interest: inst.interest,
        principal: inst.principal,
        balance: inst.balance,
        status: inst.status,
        paidAmount: inst.paidAmount ?? 0,
        paidDate: inst.paidDate ? inst.paidDate.toISOString() : null,
      })),
  };
}

app.get('/api/loans', authMiddleware, async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { tenantId: req.user.tenantId },
      include: { installments: true, client: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(loans.map(mapLoanToResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener préstamos' });
  }
});

app.post('/api/loans', authMiddleware, async (req, res) => {
  const { clientId, amount, rate, term, frequency, startDate } = req.body;
  if (!clientId || !amount || !rate || !term || !frequency || !startDate) {
    return res.status(400).json({ error: 'Faltan campos requeridos para el préstamo' });
  }

  try {
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: req.user.tenantId } });
    if (!client) {
      return res.status(400).json({ error: 'Cliente inválido para este tenant' });
    }

    const schedule = calculateSchedule(amount, rate, term, frequency, startDate);
    const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

    const loan = await prisma.loan.create({
      data: {
        tenantId: req.user.tenantId,
        clientId,
        amount: parseFloat(amount),
        rate: parseFloat(rate),
        term: parseInt(term, 10),
        frequency,
        startDate: new Date(startDate),
        status: 'ACTIVE',
        totalInterest,
        totalPaid: 0,
        installments: {
          create: schedule.map((s) => ({
            number: s.number,
            date: s.date,
            payment: s.payment,
            interest: s.interest,
            principal: s.principal,
            balance: s.balance,
          })),
        },
      },
      include: { installments: true, client: true },
    });

    return res.status(201).json(mapLoanToResponse(loan));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear préstamo' });
  }
});

app.post('/api/loans/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { installmentId, withPenalty, penaltyAmount } = req.body;
  if (!installmentId) {
    return res.status(400).json({ error: 'installmentId es requerido' });
  }

  try {
    const loan = await prisma.loan.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { installments: true, client: true },
    });
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const installment = loan.installments.find((inst) => inst.id === installmentId);
    if (!installment) {
      return res.status(404).json({ error: 'Cuota no encontrada' });
    }
    if (installment.status === 'PAID') {
      return res.status(400).json({ error: 'Esta cuota ya está pagada' });
    }

    const baseAmount = installment.payment;
    const penalty = withPenalty ? (parseFloat(penaltyAmount || 0) || 0) : 0;
    const paymentAmount = baseAmount + penalty;

    const previousTotalPaid = loan.totalPaid || 0;
    const newTotalPaid = previousTotalPaid + paymentAmount;
    const loanAmount = loan.amount;
    const remainingBalance = Math.max(loanAmount - newTotalPaid, 0);

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.loanInstallment.update({
        where: { id: installment.id },
        data: {
          status: 'PAID',
          paidAmount: baseAmount,
          paidDate: now,
        },
      });

      const remainingInstallments = loan.installments.filter((inst) => inst.id !== installment.id);
      const allPaid = remainingInstallments.every((inst) => inst.status === 'PAID');

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          totalPaid: newTotalPaid,
          status: allPaid ? 'PAID' : 'ACTIVE',
        },
        include: { installments: true, client: true },
      });

      const receipt = await tx.receipt.create({
        data: {
          tenantId: req.user.tenantId,
          loanId: loan.id,
          clientId: loan.clientId,
          amount: baseAmount,
          penaltyAmount: penalty,
          installmentNumber: installment.number,
          installmentDate: installment.date,
          loanAmount,
          totalPaidAfter: newTotalPaid,
          remainingBalance,
          withPenalty: !!withPenalty,
        },
      });

      return { updatedLoan, receipt };
    });

    return res.json({
      loan: mapLoanToResponse(result.updatedLoan),
      receipt: result.receipt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar pago' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('AUTH_LOGIN_ERROR', err);
    return res.status(500).json({
      error: 'Error interno al iniciar sesión',
      code: err.code || null,
      message: err.message || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
