require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('./generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Email Templates
const {
  getVerificationEmail,
  getResendVerificationEmail,
  getAdminNotificationEmail,
  BRAND_NAME,
} = require('./emailTemplates');

const app = express();
// Detrás de Nginx / reverse proxy, confiar en la IP de X-Forwarded-For para que express-rate-limit funcione bien
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Importar rutas nuevas
const clientsRouter = require('./routes/clients');
const loansRouter = require('./routes/loans');
const paymentsRouter = require('./routes/payments');
const syncRouter = require('./routes/sync');
const subscriptionsRouter = require('./routes/subscriptions');
const settingsRouter = require('./routes/settings');
const expensesRouter = require('./routes/expenses');
const collectorsRouter = require('./routes/collectors');


// Importar middleware de autenticación
const authMiddleware = require('./middleware/authMiddleware');

const prisma = require('./lib/prisma');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@renace.tech';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'adderlymarte@hotmail.com';

// ... (nodemailer setup logic unchanged)
// NOTE: Routes are mounted AFTER express.json() middleware below


let mailer = null;
if (SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: {
      // Permitir certificado auto-firmado del servidor SMTP propio
      rejectUnauthorized: false,
    },
  });
}


// --- Security Middleware ---
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://generativelanguage.googleapis.com", "https://prestanace.renace.tech", "https://*.renace.tech", process.env.APP_BASE_URL || "http://localhost:4000"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"], // Google avatars
      frameSrc: ["'self'", "https://accounts.google.com"]
    },
  },
  crossOriginOpenerPolicy: false, // Disable COOP to allow OAuth popups
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
});
app.use(globalLimiter);

// Rate limiting estricto para endpoints de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Solo 10 intentos de login por IP cada 15 min
  message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para registro (más estricto)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Solo 5 registros por IP por hora
  message: { error: 'Demasiados registros desde esta IP. Intenta en 1 hora.' },
});

app.use(cors());
app.use(express.json());

// MOUNT ROUTES - MUST be after express.json() to parse req.body
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/loans', authMiddleware, loansRouter);
app.use('/api/payments', authMiddleware, paymentsRouter);
app.use('/api/sync', authMiddleware, syncRouter);
app.use('/api/subscriptions', authMiddleware, subscriptionsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/expenses', authMiddleware, expensesRouter);
app.use('/api/collectors', authMiddleware, collectorsRouter);

// Configurar multer para upload de comprobantes
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Servir archivos de uploads
app.use('/uploads', express.static(uploadsDir));

// Logging condicional (solo en desarrollo)
if (!IS_PRODUCTION) {
  app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- Auth middleware ---
// --- Auth middleware imported at line 42 ---

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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        isVerified: false,
        verificationToken,
        verificationExpiresAt,
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

    if (mailer) {
      const verifyUrlBase = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
      const verifyUrl = `${verifyUrlBase.replace(/\/$/, '')}/api/tenants/verify?token=${verificationToken}`;

      if (!IS_PRODUCTION) {
        console.log('📧 Enviando correo de verificación a:', adminEmail);
      }

      // IMPORTANTE: Enviar correo de verificación al USUARIO que se registró
      try {
        await mailer.sendMail({
          from: `"${BRAND_NAME}" <${SMTP_FROM}>`,
          to: adminEmail,
          subject: `Activa tu cuenta de ${tenantName} - ${BRAND_NAME}`,
          text: `Hola,\n\nHemos creado tu cuenta para ${tenantName}. Para activarla definitivamente haz clic en el siguiente enlace antes de 3 horas:\n\n${verifyUrl}\n\nSi no reconoces este registro, ignora este correo.`,
          html: getVerificationEmail(tenantName, verifyUrl),
        });
        if (!IS_PRODUCTION) {
          console.log('✅ Correo de verificación enviado exitosamente');
        }
      } catch (err) {
        console.error('❌ MAIL_VERIFY_ERROR', err.message);
      }

      // Notificar al administrador del sistema (correo separado)
      if (ADMIN_NOTIFY_EMAIL && ADMIN_NOTIFY_EMAIL !== adminEmail) {
        try {
          await mailer.sendMail({
            from: `"${BRAND_NAME} Admin" <${SMTP_FROM}>`,
            to: ADMIN_NOTIFY_EMAIL,
            subject: `Nuevo registro de financiera en ${BRAND_NAME}`,
            text: `Se ha registrado una nueva cuenta en ${BRAND_NAME}.\n\nNombre: ${tenantName}\nSlug: ${tenantSlug}\nAdmin: ${adminEmail}\n\nEnlace de verificación:\n${verifyUrl}`,
            html: getAdminNotificationEmail(tenantName, tenantSlug, adminEmail, verifyUrl),
          });
          if (!IS_PRODUCTION) console.log('✅ Notificación enviada al admin');
        } catch (err) {
          console.error('❌ MAIL_ADMIN_REGISTER_ERROR', err);
        }
      }
    } else {
      console.warn('⚠️ Mailer no configurado - No se enviaron correos');
    }

    return res.json({
      success: true,
      requiresVerification: true,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isVerified: tenant.isVerified,
        verificationExpiresAt: tenant.verificationExpiresAt,
      },
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
      // verificationToken removed for seguridad
    });
  } catch (err) {
    console.error('TENANT_REGISTER_ERROR', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack
    });
    return res.status(500).json({
      error: 'Error interno al registrar el tenant',
      code: err.code || null,
      message: !IS_PRODUCTION ? err.message : null,
    });
  }
});

app.post('/api/tenants/resend-verification', authMiddleware, async (req, res) => {
  try {
    if (!mailer) {
      return res.status(503).json({ error: 'Servicio de correo no está configurado' });
    }

    const tenantId = req.user.tenantId;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    if (tenant.isVerified) {
      return res.status(400).json({ error: 'La cuenta ya está verificada' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        verificationToken,
        verificationExpiresAt,
      },
      include: { users: true },
    });

    const adminUser = updatedTenant.users.find((u) => u.role === 'OWNER') || updatedTenant.users[0];
    const adminEmail = adminUser?.email;

    if (!adminEmail) {
      return res.status(400).json({ error: 'No hay correo de administrador registrado' });
    }

    const verifyUrlBase = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
    const verifyUrl = `${verifyUrlBase.replace(/\/$/, '')}/api/tenants/verify?token=${verificationToken}`;

    if (!IS_PRODUCTION) {
      console.log('📧 Reenviando correo de verificación');
    }

    // IMPORTANTE: Enviar correo de reenvío al USUARIO
    try {
      await mailer.sendMail({
        from: `"${BRAND_NAME}" <${SMTP_FROM}>`,
        to: adminEmail,
        subject: `Reenvío de activación de cuenta - ${BRAND_NAME}`,
        text: `Hola,\n\nTe enviamos de nuevo el enlace para activar la cuenta de ${updatedTenant.name}.\n\nEnlace:\n${verifyUrl}\n\nSi ya activaste la cuenta, puedes ignorar este correo.`,
        html: getResendVerificationEmail(updatedTenant.name, verifyUrl),
      });
      if (!IS_PRODUCTION) {
        console.log('✅ Correo de reenvío enviado exitosamente');
      }
    } catch (err) {
      console.error('❌ MAIL_RESEND_VERIFY_ERROR', err.message);
      return res.status(500).json({ error: 'No se pudo enviar el correo de verificación' });
    }

    // Notificar al administrador del sistema (solo si es diferente al usuario)
    if (ADMIN_NOTIFY_EMAIL && ADMIN_NOTIFY_EMAIL !== adminEmail) {
      try {
        await mailer.sendMail({
          from: `"${BRAND_NAME} Admin" <${SMTP_FROM}>`,
          to: ADMIN_NOTIFY_EMAIL,
          subject: `Reenvío de verificación en ${BRAND_NAME}`,
          text: `Se ha reenviado el correo de verificación para:\n\nNombre: ${updatedTenant.name}\nSlug: ${updatedTenant.slug}\nAdmin: ${adminEmail}`,
          html: getAdminNotificationEmail(updatedTenant.name, updatedTenant.slug, adminEmail, verifyUrl),
        });
        if (!IS_PRODUCTION) console.log('✅ Notificación de reenvío enviada');
      } catch (err) {
        console.error('❌ MAIL_ADMIN_RESEND_VERIFY_ERROR', err);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('TENANT_RESEND_VERIFY_ERROR', err);
    return res.status(500).json({ error: 'Error al reenviar el correo de verificación' });
  }
});

app.get('/api/tenants/verify', async (req, res) => {
  const token = req.query.token;
  const baseUrl = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

  if (!token || typeof token !== 'string') {
    return res.redirect(`${baseUrl}/?error=Token de verificación requerido`);
  }

  try {
    const tenant = await prisma.tenant.findFirst({ where: { verificationToken: token } });
    if (!tenant) {
      return res.redirect(`${baseUrl}/?error=Token inválido o ya utilizado`);
    }

    if (tenant.verificationExpiresAt && tenant.verificationExpiresAt < new Date()) {
      if (!IS_PRODUCTION) {
        console.log('⛔ Verification link expired');
      }
      return res.redirect(`${baseUrl}/?error=El enlace de verificación ha expirado`);
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
      },
      include: { users: true },
    });

    if (mailer && ADMIN_NOTIFY_EMAIL) {
      const adminUser = updatedTenant.users.find((u) => u.role === 'OWNER') || updatedTenant.users[0];
      const adminEmail = adminUser?.email;

      if (adminEmail) {
        mailer
          .sendMail({
            from: SMTP_FROM,
            to: ADMIN_NOTIFY_EMAIL,
            subject: 'Cuenta de financiera verificada en Presta Pro',
            text: `Se ha verificado la cuenta en Presta Pro.\n\nNombre: ${updatedTenant.name}\nSlug: ${updatedTenant.slug}\nAdmin: ${adminEmail}`,
            html: `<p>Se ha <strong>verificado</strong> una cuenta en Presta Pro.</p>
              <ul>
                <li><strong>Nombre:</strong> ${updatedTenant.name}</li>
                <li><strong>Slug:</strong> ${updatedTenant.slug}</li>
                <li><strong>Admin:</strong> ${adminEmail}</li>
              </ul>`,
          })
          .catch((err) => {
            console.error('MAIL_ADMIN_VERIFY_TENANT_ERROR', err);
          });
      }
    }

    // Redirect to login with success message
    return res.redirect(`${baseUrl}/?verified=true`);
  } catch (err) {
    console.error('TENANT_VERIFY_ERROR', err);
    return res.redirect(`${baseUrl}/?error=Error al verificar la cuenta`);
  }
});

// --- AI Metrics ---

app.get('/api/ai/metrics', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [
      clientsCount,
      loansCount,
      activeLoans,
      loansAgg,
      receiptsCount,
      receiptsAgg,
      receiptsTodayAgg,
    ] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.loan.count({ where: { tenantId } }),
      prisma.loan.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.loan.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      prisma.receipt.count({ where: { tenantId } }),
      prisma.receipt.aggregate({
        where: { tenantId },
        _sum: { amount: true, penaltyAmount: true },
      }),
      prisma.receipt.aggregate({
        where: { tenantId, date: { gte: startOfToday, lt: endOfToday } },
        _sum: { amount: true, penaltyAmount: true },
        _count: { _all: true },
      }),
    ]);

    const totalLent = loansAgg._sum.amount || 0;
    const totalCollected = (receiptsAgg._sum.amount || 0) + (receiptsAgg._sum.penaltyAmount || 0);
    const totalPenalty = receiptsAgg._sum.penaltyAmount || 0;

    const todayTotalCollected = (receiptsTodayAgg._sum.amount || 0) + (receiptsTodayAgg._sum.penaltyAmount || 0);
    const todayTotalPenalty = receiptsTodayAgg._sum.penaltyAmount || 0;
    const todayReceiptsCount = receiptsTodayAgg._count._all || 0;

    return res.json({
      clientsCount,
      loansCount,
      activeLoans,
      totalLent,
      receiptsCount,
      totalCollected,
      totalPenalty,
      today: {
        receiptsCount: todayReceiptsCount,
        totalCollected: todayTotalCollected,
        totalPenalty: todayTotalPenalty,
      },
    });
  } catch (err) {
    console.error('AI_METRICS_ERROR', err);
    return res.status(500).json({ error: 'Error al calcular métricas para IA' });
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

// --- Clients routes are now handled by ./routes/clients.js imported at top ---

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

    const tenant = user.tenant;
    if (!tenant.isVerified) {
      const expiresAt = tenant.verificationExpiresAt;
      if (expiresAt && expiresAt < new Date()) {
        return res.status(403).json({ error: 'La cuenta ha expirado por falta de verificación' });
      }
      // Si no está verificado pero no ha expirado, permitimos el login temporalmente
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        isVerified: tenant.isVerified,
        verificationExpiresAt: tenant.verificationExpiresAt,
      },
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

app.post('/api/auth/google', async (req, res) => {
  const { token: googleToken, mode } = req.body; // mode: 'login' o 'register'

  if (!googleToken) {
    return res.status(400).json({ error: 'Token de Google requerido' });
  }

  if (!GOOGLE_CLIENT_ID) {
    console.error('❌ GOOGLE_CLIENT_ID no está configurado');
    return res.status(500).json({ error: 'Autenticación de Google no está configurada en el servidor' });
  }

  try {
    if (!IS_PRODUCTION) {
      console.log('🔐 Verificando token de Google...');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const googleName = payload.name || 'Usuario';
    const googlePicture = payload.picture || null;
    const googleId = payload.sub;

    if (!IS_PRODUCTION) {
      console.log('✅ Token de Google verificado para:', email);
    }

    // Buscar usuario existente
    let user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (user) {
      // Usuario existe - actualizar con datos de Google si no tiene
      if (!IS_PRODUCTION) console.log('👤 Usuario encontrado, actualizando datos de Google...');

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name === 'Administrador' ? googleName : user.name, // Solo actualiza si es el nombre por defecto
          googleId: googleId,
          photoUrl: user.photoUrl || googlePicture, // Solo actualiza si no tiene foto
        },
        include: { tenant: true },
      });

      const tenant = user.tenant;
      if (!tenant.isVerified) {
        const expiresAt = tenant.verificationExpiresAt;
        if (expiresAt && expiresAt < new Date()) {
          return res.status(403).json({ error: 'La cuenta ha expirado por falta de verificación' });
        }
      }

      const jwtToken = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      if (!IS_PRODUCTION) console.log('✅ Login con Google exitoso');

      return res.json({
        token: jwtToken,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          isVerified: user.tenant.isVerified,
          verificationExpiresAt: user.tenant.verificationExpiresAt,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          photoUrl: user.photoUrl,
        },
      });
    } else {
      // Usuario no existe - requiere registro
      if (!IS_PRODUCTION) console.log('⚠️ Usuario no encontrado');
      return res.status(401).json({
        error: 'Usuario no encontrado. Por favor regístrate primero.',
        requiresRegistration: true,
        googleData: {
          email,
          name: googleName,
          picture: googlePicture,
        }
      });
    }

  } catch (err) {
    console.error('❌ GOOGLE_AUTH_ERROR:', err.message);
    return res.status(401).json({
      error: 'Falló la autenticación con Google',
      details: err.message
    });
  }
});

// ============================================
// SUBSCRIPTION ENDPOINTS
// ============================================

const azulService = require('./services/azul');

// Get subscription plans
app.get('/api/subscriptions/plans', (req, res) => {
  const plans = Object.values(azulService.PLANS).map(plan => ({
    ...plan,
    monthlyPriceFormatted: azulService.formatPriceForDisplay(plan.monthlyPrice),
    yearlyPriceFormatted: azulService.formatPriceForDisplay(plan.yearlyPrice),
  }));
  res.json(plans);
});

// Get current subscription status
app.get('/api/subscriptions/status', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });

    if (!subscription) {
      // Create default FREE subscription
      const newSub = await prisma.subscription.create({
        data: {
          tenantId: req.user.tenantId,
          plan: 'FREE',
          status: 'ACTIVE',
          limits: JSON.stringify(azulService.PLANS.FREE.limits),
        },
      });
      return res.json({
        ...newSub,
        planDetails: azulService.PLANS.FREE,
        limits: azulService.PLANS.FREE.limits,
      });
    }

    const planDetails = azulService.PLANS[subscription.plan] || azulService.PLANS.FREE;
    const limits = typeof subscription.limits === 'string'
      ? JSON.parse(subscription.limits)
      : subscription.limits;

    res.json({
      ...subscription,
      planDetails,
      limits,
      isExpired: subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date(),
    });
  } catch (err) {
    console.error('SUBSCRIPTION_STATUS_ERROR', err);
    res.status(500).json({ error: 'Error al obtener estado de suscripción' });
  }
});

// Initiate subscription upgrade/payment
app.post('/api/subscriptions/upgrade', authMiddleware, async (req, res) => {
  const { plan, interval = 'monthly', paymentMethod } = req.body;

  if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  if (!paymentMethod || !['AZUL', 'PAYPAL', 'BANK_TRANSFER', 'CASH'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
  }

  try {
    const amount = azulService.getPlanPrice(plan, interval);
    const orderId = `SUB-${req.user.tenantId.slice(0, 8)}-${Date.now()}`;

    // Create pending payment record
    let subscription = await prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          tenantId: req.user.tenantId,
          plan: 'FREE',
          status: 'PENDING',
        },
      });
    }

    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: amount / 100, // Store in currency units
        currency: 'DOP',
        plan: plan,
        interval: interval,
        method: paymentMethod,
        status: 'PENDING',
        referenceNumber: orderId,
      },
    });

    // Generate response based on payment method
    if (paymentMethod === 'AZUL') {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

      const callbackUrl = `${process.env.APP_BASE_URL}/api/subscriptions/azul-callback`;

      const azulData = azulService.generatePaymentData({
        orderId,
        amount,
        customerName: tenant?.name || 'Cliente',
        customerEmail: user?.email || '',
        description: `Suscripción ${plan} - ${interval === 'yearly' ? 'Anual' : 'Mensual'}`,
        callbackUrl,
        cancelUrl: `${process.env.APP_BASE_URL}/?payment=cancelled`,
      });

      return res.json({
        paymentId: payment.id,
        method: 'AZUL',
        redirectUrl: azulData.pageUrl,
        formData: azulData.formData,
      });
    }

    // For manual payments (BANK_TRANSFER, CASH)
    res.json({
      paymentId: payment.id,
      method: paymentMethod,
      orderId,
      amount: amount / 100,
      amountFormatted: azulService.formatPriceForDisplay(amount),
      instructions: paymentMethod === 'BANK_TRANSFER'
        ? 'Realiza la transferencia y sube el comprobante.'
        : 'Contacta al administrador para coordinar el pago.',
    });
  } catch (err) {
    console.error('SUBSCRIPTION_UPGRADE_ERROR', err);
    res.status(500).json({ error: 'Error al procesar upgrade' });
  }
});

// Upload payment proof and send email to admin
app.post('/api/subscriptions/upload-proof', authMiddleware, upload.single('proof'), async (req, res) => {
  try {
    const { paymentId, plan, amount, method } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Comprobante requerido' });
    }

    // Get user and tenant info
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

    // Update payment with proof URL if paymentId provided
    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          proofUrl: `/uploads/${file.filename}`,
          status: 'PENDING_REVIEW',
        },
      });
    }

    // Send email to admin
    const adminEmail = 'adderlymarte@hotmail.com';
    const approveUrl = `${process.env.APP_BASE_URL}/admin/verify-payment?paymentId=${paymentId}&action=approve`;
    const rejectUrl = `${process.env.APP_BASE_URL}/admin/verify-payment?paymentId=${paymentId}&action=reject`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .info-card { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; }
          .info-value { font-weight: 600; color: #1e293b; }
          .buttons { margin-top: 30px; text-align: center; }
          .btn { display: inline-block; padding: 14px 28px; margin: 8px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .btn-approve { background: #10b981; color: white; }
          .btn-reject { background: #ef4444; color: white; }
          .proof-img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Nuevo Comprobante de Pago</h1>
          </div>
          <div class="content">
            <p>Se ha recibido un nuevo comprobante de pago para verificar:</p>
            
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Empresa:</span>
                <span class="info-value">${tenant?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Usuario:</span>
                <span class="info-value">${user?.name || 'N/A'} (${user?.email || 'N/A'})</span>
              </div>
              <div class="info-row">
                <span class="info-label">Plan Solicitado:</span>
                <span class="info-value">${plan || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Monto:</span>
                <span class="info-value">RD$${amount || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Método:</span>
                <span class="info-value">${method === 'BANK_TRANSFER' ? 'Transferencia Bancaria' : 'Efectivo/Depósito'}</span>
              </div>
            </div>
            
            <p><strong>Comprobante adjunto:</strong></p>
            <p>Ver archivo: <a href="${process.env.APP_BASE_URL}/uploads/${file.filename}">${file.filename}</a></p>
            
            <div class="buttons">
              <a href="${approveUrl}" class="btn btn-approve">✅ Aprobar y Activar</a>
              <a href="${rejectUrl}" class="btn btn-reject">❌ Rechazar</a>
            </div>
          </div>
          <div class="footer">
            <p>Presta Pro by Renace.Tech</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (mailTransporter) {
      await mailTransporter.sendMail({
        from: `"Presta Pro" <${SMTP_USER || 'noreply@renace.tech'}>`,
        to: adminEmail,
        subject: `💳 Comprobante de Pago - ${tenant?.name || 'Nuevo Cliente'} - Plan ${plan}`,
        html: emailHtml,
        attachments: [{
          filename: file.originalname,
          path: file.path,
        }],
      });
    }

    res.json({
      success: true,
      message: 'Comprobante enviado. Recibirás confirmación por correo.',
    });
  } catch (err) {
    console.error('UPLOAD_PROOF_ERROR', err);
    res.status(500).json({ error: 'Error al procesar comprobante' });
  }
});

// Azul callback (POST from Azul after payment)
app.post('/api/subscriptions/azul-callback', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const response = azulService.parseResponse(req.body);

    // Verify hash
    if (!azulService.verifyResponseHash(req.body)) {
      console.error('AZUL_INVALID_HASH', req.body);
      return res.redirect(`${process.env.APP_BASE_URL}/?payment=invalid`);
    }

    // Find payment by order ID
    const payment = await prisma.payment.findFirst({
      where: { referenceNumber: response.orderId },
      include: { subscription: true },
    });

    if (!payment) {
      return res.redirect(`${process.env.APP_BASE_URL}/?payment=notfound`);
    }

    if (response.success) {
      // Update payment as verified
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'VERIFIED',
          externalTransactionId: response.authorizationCode,
          verifiedAt: new Date(),
          externalData: JSON.stringify(response.rawData),
        },
      });

      // Activate subscription
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (payment.interval === 'yearly' ? 12 : 1));

      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          plan: payment.plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          limits: JSON.stringify(azulService.PLANS[payment.plan].limits),
        },
      });

      return res.redirect(`${process.env.APP_BASE_URL}/?payment=success`);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          rejectedReason: response.message,
        },
      });

      return res.redirect(`${process.env.APP_BASE_URL}/?payment=declined`);
    }
  } catch (err) {
    console.error('AZUL_CALLBACK_ERROR', err);
    return res.redirect(`${process.env.APP_BASE_URL}/?payment=error`);
  }
});

// Upload payment proof (for bank transfer)
app.post('/api/subscriptions/upload-proof', authMiddleware, async (req, res) => {
  const { paymentId, proofImageUrl, referenceNumber } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId es requerido' });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        subscription: { tenantId: req.user.tenantId },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofImageUrl,
        referenceNumber: referenceNumber || payment.referenceNumber,
        notes: 'Pendiente de verificación',
      },
    });

    res.json({ success: true, message: 'Comprobante subido. Pendiente de verificación.' });
  } catch (err) {
    console.error('UPLOAD_PROOF_ERROR', err);
    res.status(500).json({ error: 'Error al subir comprobante' });
  }
});

// Get payment history
app.get('/api/subscriptions/payments', authMiddleware, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
    });

    if (!subscription) {
      return res.json([]);
    }

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    console.error('PAYMENTS_HISTORY_ERROR', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Middleware to check admin role
const adminMiddleware = async (req, res, next) => {
  if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

// Get all subscriptions (admin)
app.get('/api/admin/subscriptions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        tenant: { select: { name: true, slug: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(subscriptions);
  } catch (err) {
    console.error('ADMIN_SUBSCRIPTIONS_ERROR', err);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// Get pending payments (admin)
app.get('/api/admin/payments/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        subscription: {
          include: { tenant: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(payments);
  } catch (err) {
    console.error('ADMIN_PENDING_PAYMENTS_ERROR', err);
    res.status(500).json({ error: 'Error al obtener pagos pendientes' });
  }
});

// Verify payment (admin)
app.post('/api/admin/payments/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Update payment
    await prisma.payment.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedBy: req.user.userId,
        verifiedAt: new Date(),
        notes: notes || 'Verificado manualmente',
      },
    });

    // Activate subscription
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (payment.interval === 'yearly' ? 12 : 1));

    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        plan: payment.plan,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        limits: JSON.stringify(azulService.PLANS[payment.plan].limits),
      },
    });

    res.json({ success: true, message: 'Pago verificado y suscripción activada' });
  } catch (err) {
    console.error('ADMIN_VERIFY_PAYMENT_ERROR', err);
    res.status(500).json({ error: 'Error al verificar pago' });
  }
});

// Reject payment (admin)
app.post('/api/admin/payments/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason || 'Rechazado por el administrador',
        verifiedBy: req.user.userId,
        verifiedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Pago rechazado' });
  } catch (err) {
    console.error('ADMIN_REJECT_PAYMENT_ERROR', err);
    res.status(500).json({ error: 'Error al rechazar pago' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
