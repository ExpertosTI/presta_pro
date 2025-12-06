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

const app = express();
// Detrás de Nginx / reverse proxy, confiar en la IP de X-Forwarded-For para que express-rate-limit funcione bien
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@renace.tech';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'adderlymarte@hotmail.com';

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", process.env.APP_BASE_URL || "http://localhost:4000"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"], // Google avatars
      frameSrc: ["'self'", "https://accounts.google.com"]
    },
  },
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- Auth middleware ---
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const tenant = await prisma.tenant.findUnique({ where: { id: payload.tenantId } });
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant no encontrado' });
    }

    if (!tenant.isVerified) {
      const expiresAt = tenant.verificationExpiresAt;
      if (expiresAt && expiresAt < new Date()) {
        return res.status(403).json({ error: 'La cuenta ha expirado por falta de verificación' });
      }
      // Si aún no ha verificado pero no ha expirado, se permite acceso temporal
    }

    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    req.tenant = { id: tenant.id, isVerified: tenant.isVerified };
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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 horas

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

      mailer
        .sendMail({
          from: `"${tenantName}" <${SMTP_FROM}>`,
          to: adminEmail,
          subject: `Activa tu cuenta de ${tenantName}`,
          text: `Hola,\n\nHemos creado tu cuenta para ${tenantName}. Para activarla definitivamente haz clic en el siguiente enlace antes de 3 horas:\n\n${verifyUrl}\n\nSi no reconoces este registro, ignora este correo.`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${tenantName}</h1>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Plataforma de Préstamos</p>
              </div>
              <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">¡Bienvenido/a!</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">Hemos recibido la solicitud de registro para <strong>${tenantName}</strong>. Para configurar tu espacio de trabajo y comenzar a utilizar la plataforma, activa tu cuenta haciendo clic en el botón de abajo:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Activar mi Cuenta</a>
                </div>
                <p style="color: #475569; font-size: 14px;">O copia y pega el siguiente enlace en tu navegador:</p>
                <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #334155; border: 1px solid #e2e8f0;">${verifyUrl}</p>
                <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; pt-4;">Este enlace de seguridad expirará en <strong>3 horas</strong>.</p>
              </div>
              <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ${tenantName}. Todos los derechos reservados.<br/>
                <span style="opacity: 0.7;">Powered by Presta Pro</span>
              </div>
            </div>
          `,
        })
        .catch((err) => {
          console.error('MAIL_VERIFY_ERROR', err);
        });

      if (ADMIN_NOTIFY_EMAIL) {
        mailer
          .sendMail({
            from: SMTP_FROM,
            to: ADMIN_NOTIFY_EMAIL,
            subject: 'Nuevo registro de financiera en Presta Pro',
            text: `Se ha registrado una nueva cuenta en Presta Pro.\n\nNombre: ${tenantName}\nSlug: ${tenantSlug}\nAdmin: ${adminEmail}\n\nEnlace de verificación:\n${verifyUrl}`,
            html: `<p>Se ha registrado una nueva cuenta en <strong>Presta Pro</strong>.</p>
              <ul>
                <li><strong>Nombre:</strong> ${tenantName}</li>
                <li><strong>Slug:</strong> ${tenantSlug}</li>
                <li><strong>Admin:</strong> ${adminEmail}</li>
              </ul>
              <p>Enlace de verificación: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
          })
          .catch((err) => {
            console.error('MAIL_ADMIN_REGISTER_ERROR', err);
          });
      }
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
    return res.status(500).json({
      error: 'Error interno al registrar el tenant',
      code: err.code || null,
      message: err.message || null,
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
    const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

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

    mailer
      .sendMail({
        from: `"${updatedTenant.name}" <${SMTP_FROM}>`,
        to: adminEmail,
        subject: `Reenvío de activación de cuenta`,
        text: `Hola,\n\nTe enviamos de nuevo el enlace para activar la cuenta de ${updatedTenant.name}.\n\nEnlace:\n${verifyUrl}\n\nSi ya activaste la cuenta, puedes ignorar este correo.`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${updatedTenant.name}</h1>
              </div>
              <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 20px;">Enlace de Activación</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">Hemos recibido una solicitud para reenviar el enlace de activación de tu cuenta.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Activar Cuenta Ahora</a>
                </div>
                <p style="color: #64748b; font-size: 13px; margin-top: 30px;">Si ya configuraste tu cuenta, puedes ignorar este mensaje.</p>
              </div>
            </div>
        `,
      })
      .catch((err) => {
        console.error('MAIL_RESEND_VERIFY_ERROR', err);
      });

    if (ADMIN_NOTIFY_EMAIL && ADMIN_NOTIFY_EMAIL !== adminEmail) {
      mailer
        .sendMail({
          from: SMTP_FROM,
          to: ADMIN_NOTIFY_EMAIL,
          subject: 'Reenvío de verificación de cuenta en Presta Pro',
          text: `Se ha reenviado el correo de verificación para:\n\nNombre: ${updatedTenant.name}\nSlug: ${updatedTenant.slug}\nAdmin: ${adminEmail}`,
          html: `<p>Se ha reenviado el correo de verificación para una cuenta de <strong>Presta Pro</strong>.</p>
            <ul>
              <li><strong>Nombre:</strong> ${updatedTenant.name}</li>
              <li><strong>Slug:</strong> ${updatedTenant.slug}</li>
              <li><strong>Admin:</strong> ${adminEmail}</li>
            </ul>`,
        })
        .catch((err) => {
          console.error('MAIL_ADMIN_RESEND_VERIFY_ERROR', err);
        });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('TENANT_RESEND_VERIFY_ERROR', err);
    return res.status(500).json({ error: 'Error al reenviar el correo de verificación' });
  }
});

app.get('/api/tenants/verify', async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token de verificación requerido' });
  }

  try {
    const tenant = await prisma.tenant.findFirst({ where: { verificationToken: token } });
    if (!tenant) {
      return res.status(400).json({ error: 'Token inválido o ya utilizado' });
    }

    if (tenant.verificationExpiresAt && tenant.verificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'El enlace de verificación ha expirado' });
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

    return res.json({ success: true });
  } catch (err) {
    console.error('TENANT_VERIFY_ERROR', err);
    return res.status(500).json({ error: 'Error al verificar la cuenta' });
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
  const { token: googleToken } = req.body;
  if (!googleToken) {
    return res.status(400).json({ error: 'Token de Google requerido' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado. Por favor regístrate primero.' });
    }

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

    return res.json({
      token: jwtToken,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

  } catch (err) {
    console.error('GOOGLE_AUTH_ERROR', err);
    return res.status(401).json({ error: 'Falló la autenticación con Google' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
