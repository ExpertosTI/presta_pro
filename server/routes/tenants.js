/**
 * Tenant Routes
 * RenKredit by Renace.tech
 * 
 * Rutas para registro, verificación y gestión de tenants
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { validatePassword, validateEmail } = require('../lib/securityUtils');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
    getVerificationEmail,
    getResendVerificationEmail,
    getAdminNotificationEmail,
    BRAND_NAME,
} = require('../emailTemplates');

// Importar mailer y config desde index.js (se pasarán como dependencias)
let mailer = null;
let PORT = 4000;
let SMTP_FROM = '';
let ADMIN_NOTIFY_EMAIL = '';
let IS_PRODUCTION = false;
let EFFECTIVE_JWT_SECRET = '';

// Función para inicializar las dependencias
const initTenantRoutes = (deps) => {
    mailer = deps.mailer;
    PORT = deps.PORT;
    SMTP_FROM = deps.SMTP_FROM;
    ADMIN_NOTIFY_EMAIL = deps.ADMIN_NOTIFY_EMAIL;
    IS_PRODUCTION = deps.IS_PRODUCTION;
    EFFECTIVE_JWT_SECRET = deps.EFFECTIVE_JWT_SECRET;
};

/**
 * POST /api/tenants/register - Registrar nuevo tenant
 */
router.post('/register', async (req, res) => {
    const { tenantName, tenantSlug, adminEmail, adminPassword } = req.body;
    if (!tenantName || !tenantSlug || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // SECURITY: Validate email format
    if (!validateEmail(adminEmail)) {
        return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
    }

    // SECURITY: Validate password strength
    const passwordValidation = validatePassword(adminPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({
            error: 'Contraseña no cumple los requisitos de seguridad',
            details: passwordValidation.errors
        });
    }

    // SECURITY: Validate slug format (alphanumeric, lowercase, hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(tenantSlug) || tenantSlug.length < 3 || tenantSlug.length > 50) {
        return res.status(400).json({ error: 'El slug debe ser alfanumérico, en minúsculas, entre 3-50 caracteres' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (existingUser) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        // SECURITY: Use higher bcrypt rounds in production
        const bcryptRounds = IS_PRODUCTION ? 12 : 10;
        const passwordHash = await bcrypt.hash(adminPassword, bcryptRounds);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
            EFFECTIVE_JWT_SECRET,
            { expiresIn: '12h' }
        );

        if (mailer) {
            const verifyUrlBase = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
            const verifyUrl = `${verifyUrlBase.replace(/\/$/, '')}/api/tenants/verify?token=${verificationToken}`;

            try {
                await mailer.sendMail({
                    from: `"${BRAND_NAME}" <${SMTP_FROM}>`,
                    to: adminEmail,
                    subject: `Activa tu cuenta de ${tenantName} - ${BRAND_NAME}`,
                    text: `Hola,\n\nHemos creado tu cuenta para ${tenantName}. Para activarla haz clic en el siguiente enlace:\n\n${verifyUrl}`,
                    html: getVerificationEmail(tenantName, verifyUrl),
                });
            } catch (err) {
                console.error('❌ MAIL_VERIFY_ERROR', err.message);
            }

            // Notificar al admin del sistema
            if (ADMIN_NOTIFY_EMAIL && ADMIN_NOTIFY_EMAIL !== adminEmail) {
                try {
                    await mailer.sendMail({
                        from: `"${BRAND_NAME} Admin" <${SMTP_FROM}>`,
                        to: ADMIN_NOTIFY_EMAIL,
                        subject: `Nuevo registro de financiera en ${BRAND_NAME}`,
                        html: getAdminNotificationEmail(tenantName, tenantSlug, adminEmail, verifyUrl),
                    });
                } catch (err) {
                    console.error('❌ MAIL_ADMIN_REGISTER_ERROR', err);
                }
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
        });
    } catch (err) {
        console.error('TENANT_REGISTER_ERROR', err);
        return res.status(500).json({
            error: 'Error interno al registrar el tenant',
            code: err.code || null,
            message: !IS_PRODUCTION ? err.message : null,
        });
    }
});

/**
 * POST /api/tenants/resend-verification - Reenviar verificación (con auth)
 */
router.post('/resend-verification', authMiddleware, async (req, res) => {
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
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { verificationToken, verificationExpiresAt },
            include: { users: true },
        });

        const adminUser = updatedTenant.users.find((u) => u.role === 'OWNER') || updatedTenant.users[0];
        const adminEmail = adminUser?.email;

        if (!adminEmail) {
            return res.status(400).json({ error: 'No hay correo de administrador registrado' });
        }

        const verifyUrlBase = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
        const verifyUrl = `${verifyUrlBase.replace(/\/$/, '')}/api/tenants/verify?token=${verificationToken}`;

        try {
            await mailer.sendMail({
                from: `"${BRAND_NAME}" <${SMTP_FROM}>`,
                to: adminEmail,
                subject: `Reenvío de activación de cuenta - ${BRAND_NAME}`,
                html: getResendVerificationEmail(updatedTenant.name, verifyUrl),
            });
        } catch (err) {
            console.error('❌ MAIL_RESEND_VERIFY_ERROR', err.message);
            return res.status(500).json({ error: 'No se pudo enviar el correo de verificación' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('TENANT_RESEND_VERIFY_ERROR', err);
        return res.status(500).json({ error: 'Error al reenviar el correo de verificación' });
    }
});

/**
 * POST /api/tenants/resend-verification-public - Reenviar verificación (público)
 */
router.post('/resend-verification-public', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email es requerido' });
        }

        if (!mailer) {
            return res.status(503).json({ error: 'Servicio de correo no está configurado' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: { tenant: true },
        });

        if (!user || !user.tenant) {
            return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de verificación.' });
        }

        const tenant = user.tenant;

        if (tenant.isVerified) {
            return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de verificación.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { verificationToken, verificationExpiresAt },
        });

        const verifyUrlBase = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
        const verifyUrl = `${verifyUrlBase.replace(/\/$/, '')}/api/tenants/verify?token=${verificationToken}`;

        try {
            await mailer.sendMail({
                from: `"${BRAND_NAME}" <${SMTP_FROM}>`,
                to: email,
                subject: `Reactivación de cuenta - ${BRAND_NAME}`,
                html: getResendVerificationEmail(updatedTenant.name, verifyUrl),
            });
        } catch (err) {
            console.error('❌ MAIL_PUBLIC_RESEND_VERIFY_ERROR', err.message);
            return res.status(500).json({ error: 'No se pudo enviar el correo de verificación' });
        }

        return res.json({ success: true, message: 'Se ha enviado un nuevo correo de verificación.' });
    } catch (err) {
        console.error('TENANT_PUBLIC_RESEND_VERIFY_ERROR', err);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

/**
 * GET /api/tenants/verify - Verificar cuenta
 */
router.get('/verify', async (req, res) => {
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
                mailer.sendMail({
                    from: SMTP_FROM,
                    to: ADMIN_NOTIFY_EMAIL,
                    subject: 'Cuenta de financiera verificada en RenKredit',
                    html: `<p>Se ha <strong>verificado</strong> una cuenta en RenKredit.</p>
            <ul>
              <li><strong>Nombre:</strong> ${updatedTenant.name}</li>
              <li><strong>Slug:</strong> ${updatedTenant.slug}</li>
              <li><strong>Admin:</strong> ${adminEmail}</li>
            </ul>`,
                }).catch((err) => console.error('MAIL_ADMIN_VERIFY_TENANT_ERROR', err));
            }
        }

        return res.redirect(`${baseUrl}/?verified=true`);
    } catch (err) {
        console.error('TENANT_VERIFY_ERROR', err);
        return res.redirect(`${baseUrl}/?error=Error al verificar la cuenta`);
    }
});

module.exports = router;
module.exports.initTenantRoutes = initTenantRoutes;
