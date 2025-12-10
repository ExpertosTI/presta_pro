const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Email config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'admin@renace.tech';
const FROM_EMAIL = process.env.SMTP_FROM || '"PrestaPro" <noreply@renace.tech>';

// Multer config for proof uploads
const uploadsDir = path.join(__dirname, '../uploads/proofs');
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo imágenes y PDF permitidos'));
        }
    }
});

// Plan definitions
const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Plan Gratis',
        monthlyPrice: 0,
        yearlyPrice: 0,
        monthlyPriceFormatted: 'RD$0.00',
        yearlyPriceFormatted: 'RD$0.00',
        features: ['10 clientes', '5 préstamos activos', '1 usuario', 'Sin acceso a IA', 'Expira en 30 días'],
        limits: { maxClients: 10, maxLoans: 5, maxUsers: 1, aiQueries: 0 }
    },
    PRO: {
        id: 'PRO',
        name: 'Plan Profesional',
        monthlyPrice: 800,
        yearlyPrice: 8000,
        monthlyPriceFormatted: 'RD$800.00',
        yearlyPriceFormatted: 'RD$8,000.00',
        features: ['100 clientes', '50 préstamos activos', '5 usuarios', '100 consultas AI/mes'],
        limits: { maxClients: 100, maxLoans: 50, maxUsers: 5, aiQueries: 100 }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        monthlyPrice: 1400,
        yearlyPrice: 14000,
        monthlyPriceFormatted: 'RD$1,400.00',
        yearlyPriceFormatted: 'RD$14,000.00',
        features: ['Clientes ilimitados', 'Préstamos ilimitados', 'Usuarios ilimitados', 'AI ilimitado', 'Soporte prioritario'],
        limits: { maxClients: -1, maxLoans: -1, maxUsers: -1, aiQueries: -1 }
    }
};

// GET /plans
router.get('/plans', (req, res) => {
    res.json(Object.values(PLANS));
});

// GET /my-subscription - Get current subscription status
router.get('/my-subscription', async (req, res) => {
    try {
        const tId = req.user?.tenantId;
        if (!tId) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        let subscription = await prisma.subscription.findUnique({
            where: { tenantId: tId },
            include: {
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        // Create FREE subscription if none exists
        if (!subscription) {
            subscription = await prisma.subscription.create({
                data: {
                    tenantId: tId,
                    plan: 'FREE',
                    status: 'ACTIVE',
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    limits: JSON.stringify(PLANS.FREE.limits)
                },
                include: { payments: true }
            });
        }

        const plan = PLANS[subscription.plan] || PLANS.FREE;

        res.json({
            ...subscription,
            planDetails: plan,
            isExpired: subscription.status === 'EXPIRED' ||
                (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()),
            isTrial: subscription.plan === 'FREE' && subscription.trialEndsAt,
            daysRemaining: subscription.currentPeriodEnd
                ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
                : subscription.trialEndsAt
                    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Error obteniendo suscripción' });
    }
});

// POST /upload-proof (Manual payments)
router.post('/upload-proof', upload.single('proof'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const { plan, method, interval } = req.body;
        const tId = req.user.tenantId;

        // Validate plan
        if (!PLANS[plan]) {
            return res.status(400).json({ error: 'Plan inválido' });
        }

        const planDetails = PLANS[plan];
        const amount = interval === 'yearly' ? planDetails.yearlyPrice : planDetails.monthlyPrice;

        // Get or create subscription
        let subscription = await prisma.subscription.findUnique({
            where: { tenantId: tId }
        });

        if (!subscription) {
            subscription = await prisma.subscription.create({
                data: {
                    tenantId: tId,
                    plan: 'FREE',
                    status: 'PENDING',
                    limits: JSON.stringify(PLANS.FREE.limits)
                }
            });
        }

        // Get tenant and user info
        const tenant = await prisma.tenant.findUnique({
            where: { id: tId },
            include: { users: true }
        });
        const user = tenant?.users.find(u => u.id === req.user.userId);

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                subscriptionId: subscription.id,
                amount,
                currency: 'DOP',
                plan,
                interval: interval || 'monthly',
                method: method || 'BANK_TRANSFER',
                status: 'PENDING',
                proofImageUrl: `/uploads/proofs/${req.file.filename}`,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                tenantId: tId,
                action: 'payment.proof_uploaded',
                resource: 'payment',
                resourceId: payment.id,
                details: { plan, method, amount, filename: req.file.filename },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // Send email to admin
        try {
            await transporter.sendMail({
                from: FROM_EMAIL,
                to: ADMIN_EMAIL,
                subject: `[PrestaPro] Nuevo Comprobante de Pago - ${tenant?.name || tId}`,
                html: `
                    <h2>Nuevo Comprobante de Pago Recibido</h2>
                    <p><strong>Empresa:</strong> ${tenant?.name || 'N/A'}</p>
                    <p><strong>Usuario:</strong> ${user?.name || user?.email || 'N/A'}</p>
                    <p><strong>Plan:</strong> ${planDetails.name}</p>
                    <p><strong>Monto:</strong> RD$${amount.toLocaleString()}</p>
                    <p><strong>Método:</strong> ${method}</p>
                    <p><strong>Intervalo:</strong> ${interval}</p>
                    <p><strong>ID Pago:</strong> ${payment.id}</p>
                    <hr>
                    <p>Revisa el comprobante en el panel de administración.</p>
                `
            });
        } catch (emailErr) {
            console.error('Admin email error:', emailErr);
        }

        // Send confirmation email to user
        if (user?.email) {
            try {
                await transporter.sendMail({
                    from: FROM_EMAIL,
                    to: user.email,
                    subject: `[PrestaPro] Comprobante Recibido - Pendiente de Verificación`,
                    html: `
                        <h2>¡Comprobante Recibido!</h2>
                        <p>Hola ${user.name || ''},</p>
                        <p>Hemos recibido tu comprobante de pago para el <strong>${planDetails.name}</strong>.</p>
                        <p><strong>Monto:</strong> RD$${amount.toLocaleString()}</p>
                        <p>Nuestro equipo verificará el pago en las próximas 24 horas hábiles.</p>
                        <p>Recibirás un correo de confirmación cuando tu plan sea activado.</p>
                        <hr>
                        <p>Gracias por confiar en PrestaPro.</p>
                    `
                });
            } catch (emailErr) {
                console.error('User email error:', emailErr);
            }
        }

        res.json({
            success: true,
            paymentId: payment.id,
            message: 'Comprobante recibido. Pendiente de verificación (24h hábiles).'
        });

    } catch (error) {
        console.error('Proof upload error:', error);
        res.status(500).json({ error: 'Error subiendo comprobante' });
    }
});

// POST /verify-payment (Admin only)
router.post('/verify-payment', async (req, res) => {
    try {
        const { paymentId, action, rejectedReason } = req.body;

        // Check admin role
        if (req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                subscription: {
                    include: {
                        tenant: {
                            include: { users: true }
                        }
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        if (action === 'approve') {
            const plan = PLANS[payment.plan] || PLANS.FREE;
            const periodMonths = payment.interval === 'yearly' ? 12 : 1;
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

            // Update payment
            await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'VERIFIED',
                    verifiedBy: req.user.userId,
                    verifiedAt: new Date()
                }
            });

            // Update subscription
            await prisma.subscription.update({
                where: { id: payment.subscriptionId },
                data: {
                    plan: payment.plan,
                    status: 'ACTIVE',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: periodEnd,
                    limits: JSON.stringify(plan.limits)
                }
            });

            // Send confirmation email to user
            const tenant = payment.subscription.tenant;
            const user = tenant?.users?.[0];
            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: FROM_EMAIL,
                        to: user.email,
                        subject: `[PrestaPro] ¡Plan Activado! - ${plan.name}`,
                        html: `
                            <h2>🎉 ¡Tu plan ha sido activado!</h2>
                            <p>Hola ${user.name || ''},</p>
                            <p>Tu pago ha sido verificado y tu <strong>${plan.name}</strong> está activo.</p>
                            <p><strong>Válido hasta:</strong> ${periodEnd.toLocaleDateString('es-DO')}</p>
                            <h3>Beneficios de tu plan:</h3>
                            <ul>
                                ${plan.features.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                            <hr>
                            <p>¡Gracias por usar PrestaPro!</p>
                        `
                    });
                } catch (emailErr) {
                    console.error('Activation email error:', emailErr);
                }
            }

            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.user.userId,
                    tenantId: payment.subscription.tenantId,
                    action: 'payment.verified',
                    resource: 'payment',
                    resourceId: paymentId,
                    details: { plan: payment.plan, amount: payment.amount }
                }
            });

            res.json({ success: true, message: 'Pago verificado y plan activado' });

        } else if (action === 'reject') {
            await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'REJECTED',
                    rejectedReason: rejectedReason || 'No especificado',
                    verifiedBy: req.user.userId,
                    verifiedAt: new Date()
                }
            });

            // Send rejection email
            const tenant = payment.subscription.tenant;
            const user = tenant?.users?.[0];
            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: FROM_EMAIL,
                        to: user.email,
                        subject: `[PrestaPro] Pago Rechazado`,
                        html: `
                            <h2>Pago No Verificado</h2>
                            <p>Hola ${user.name || ''},</p>
                            <p>Tu comprobante de pago no pudo ser verificado.</p>
                            <p><strong>Motivo:</strong> ${rejectedReason || 'No especificado'}</p>
                            <p>Por favor, sube un nuevo comprobante válido o contacta soporte.</p>
                        `
                    });
                } catch (emailErr) {
                    console.error('Rejection email error:', emailErr);
                }
            }

            await prisma.auditLog.create({
                data: {
                    userId: req.user.userId,
                    tenantId: payment.subscription.tenantId,
                    action: 'payment.rejected',
                    resource: 'payment',
                    resourceId: paymentId,
                    details: { reason: rejectedReason }
                }
            });

            res.json({ success: true, message: 'Pago rechazado' });

        } else {
            res.status(400).json({ error: 'Acción inválida' });
        }

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Error verificando pago' });
    }
});

// GET /pending-payments (Admin only)
router.get('/pending-payments', async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const payments = await prisma.payment.findMany({
            where: { status: 'PENDING' },
            include: {
                subscription: {
                    include: {
                        tenant: {
                            include: { users: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(payments);

    } catch (error) {
        console.error('Get pending payments error:', error);
        res.status(500).json({ error: 'Error obteniendo pagos pendientes' });
    }
});

module.exports = router;

