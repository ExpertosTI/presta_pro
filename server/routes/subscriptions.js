const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Email config - use same defaults as server/index.js and emailService.js
const SMTP_HOST = process.env.SMTP_HOST || '85.31.224.232';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const SMTP_USER = process.env.SMTP_USER || 'noreply@prestapro.renace.tech';
const SMTP_PASS = process.env.SMTP_PASS || '';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? {
        user: SMTP_USER,
        pass: SMTP_PASS,
    } : undefined,
    tls: { rejectUnauthorized: false }
});

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'adderlymarte@hotmail.com';
const FROM_EMAIL = process.env.SMTP_FROM || '"PRESTAPRO" <noreply@prestapro.renace.tech>';

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

// Plan definitions - USD pricing with promotional offers
const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Gratis',
        description: 'Ideal para probar la plataforma',
        price: 0,
        monthlyPrice: 0,
        quarterlyPrice: 0, // 3 months
        yearlyPrice: 0,
        promoPrice: 0, // Promo: pay 3 months, get 1 year
        monthlyPriceFormatted: '$0.00',
        quarterlyPriceFormatted: '$0.00',
        yearlyPriceFormatted: '$0.00',
        promoPriceFormatted: '$0.00',
        promoLabel: null,
        features: ['10 clientes', '5 préstamos activos', '1 usuario', 'Sin acceso a IA', 'Expira en 30 días'],
        limits: { maxClients: 10, maxLoans: 5, maxUsers: 1, aiQueries: 0 }
    },
    PRO: {
        id: 'PRO',
        name: 'Plan Profesional',
        description: 'Para prestamistas en crecimiento',
        price: 15, // USD normal price
        monthlyPrice: 1500, // $15.00 in cents
        quarterlyPrice: 2997, // $29.97 (3 months at $9.99)
        yearlyPrice: 11988, // $119.88 ($9.99/month for 12 months)
        promoPrice: 2997, // $29.97 for 3 months = locked at $9.99/month for 1 year
        monthlyPriceFormatted: '$15.00 USD',
        quarterlyPriceFormatted: '$29.97 USD',
        yearlyPriceFormatted: '$119.88 USD',
        promoPriceFormatted: '$9.99 USD/mes',
        promoLabel: '🔥 OFERTA: Paga 3 meses a $9.99/mes y queda fijo todo el año',
        features: ['100 clientes', '50 préstamos activos', '5 usuarios', '100 consultas AI/mes'],
        limits: { maxClients: 100, maxLoans: 50, maxUsers: 5, aiQueries: 100 }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        description: 'Máxima potencia sin límites',
        price: 27, // USD normal price
        monthlyPrice: 2700, // $27.00 in cents
        quarterlyPrice: 5697, // $56.97 (3 months at $18.99)
        yearlyPrice: 22788, // $227.88 ($18.99/month for 12 months)
        promoPrice: 5697, // $56.97 for 3 months = locked at $18.99/month for 1 year
        monthlyPriceFormatted: '$27.00 USD',
        quarterlyPriceFormatted: '$56.97 USD',
        yearlyPriceFormatted: '$227.88 USD',
        promoPriceFormatted: '$18.99 USD/mes',
        promoLabel: '🔥 OFERTA: Paga 3 meses a $18.99/mes y queda fijo todo el año',
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

        // MASTER plan for SUPER_ADMIN users (owner accounts)
        const isSuperAdmin = req.user?.role?.toUpperCase() === 'SUPER_ADMIN';

        let plan;
        let displayPlan;

        if (isSuperAdmin) {
            // Owner gets MASTER plan with unlimited everything
            displayPlan = 'MASTER';
            plan = {
                id: 'MASTER',
                name: 'Plan Master',
                description: 'Acceso completo del propietario',
                price: 0,
                monthlyPrice: 0,
                features: ['Clientes ilimitados', 'Préstamos ilimitados', 'Usuarios ilimitados', 'AI ilimitado', 'Acceso Admin Panel', 'Sin restricciones'],
                limits: { maxClients: -1, maxLoans: -1, maxUsers: -1, aiQueries: -1 }
            };
        } else {
            displayPlan = subscription.plan;
            plan = PLANS[subscription.plan] || PLANS.FREE;
        }

        // Get actual counts for usage display
        const [clientCount, loanCount] = await Promise.all([
            prisma.client.count({ where: { tenantId: tId } }),
            prisma.loan.count({ where: { tenantId: tId } })
        ]);

        res.json({
            ...subscription,
            plan: displayPlan,
            planDetails: plan,
            limits: plan.limits,
            _count: {
                clients: clientCount,
                loans: loanCount
            },
            isExpired: isSuperAdmin ? false : (subscription.status === 'EXPIRED' ||
                (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date())),
            isTrial: isSuperAdmin ? false : (subscription.plan === 'FREE' && subscription.trialEndsAt),
            daysRemaining: isSuperAdmin ? 9999 : (subscription.currentPeriodEnd
                ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
                : subscription.trialEndsAt
                    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0)
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Error obteniendo suscripción' });
    }
});

// GET /pending-payments - Admin: Get all pending payments for verification
router.get('/pending-payments', async (req, res) => {
    try {
        // Only SUPER_ADMIN and ADMIN can access
        const role = req.user?.role?.toUpperCase();
        if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
        }

        const payments = await prisma.payment.findMany({
            where: { status: 'PENDING' },
            include: {
                subscription: {
                    include: {
                        tenant: {
                            select: { id: true, name: true, slug: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(payments);
    } catch (error) {
        console.error('Get pending payments error:', error);
        res.status(500).json({ error: 'Error obteniendo pagos pendientes' });
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

        // Send email to admin with attachment
        const paymentMethod = method || 'BANK_TRANSFER';
        const methodLabels = {
            'BANK_TRANSFER': 'Transferencia Bancaria',
            'CASH': 'Efectivo',
            'MOBILE_PAYMENT': 'Pago Móvil',
            'PAYPAL': 'PayPal',
            'CARD': 'Tarjeta de Crédito'
        };

        try {
            const proofFilePath = path.join(uploadsDir, req.file.filename);
            await transporter.sendMail({
                from: FROM_EMAIL,
                to: ADMIN_EMAIL,
                subject: `[PrestaPro] ⚡ Nuevo Comprobante - ${tenant?.name || tId} - ${planDetails.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="margin: 0;">💰 Nuevo Comprobante de Pago</h1>
                            <p style="margin: 10px 0 0; opacity: 0.9;">Requiere verificación</p>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>🏢 Empresa:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${tenant?.name || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>👤 Usuario:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${user?.name || user?.email || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>📧 Email:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${user?.email || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>📋 Plan:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${planDetails.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>💵 Monto:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: bold; font-size: 18px;">RD$${amount.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>💳 Método:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${methodLabels[paymentMethod] || paymentMethod}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>📆 Intervalo:</strong></td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${interval === 'yearly' ? 'Anual' : 'Mensual'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0;"><strong>🔑 ID Pago:</strong></td>
                                    <td style="padding: 10px 0; font-family: monospace; font-size: 12px;">${payment.id}</td>
                                </tr>
                            </table>
                            
                            <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0; color: #92400e;">📎 <strong>El comprobante está adjunto a este correo.</strong></p>
                            </div>
                            
                            <div style="margin-top: 20px; text-align: center;">
                                <a href="${process.env.APP_BASE_URL || 'https://prestanace.renace.tech'}/#/admin?payment=${payment.id}" 
                                   style="display: inline-block; padding: 12px 30px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    ✅ Verificar y Aprobar Pago
                                </a>
                            </div>
                            
                            <p style="margin-top: 20px; text-align: center; color: #64748b; font-size: 12px;">
                                Tenant ID: ${tId}
                            </p>
                        </div>
                    </div>
                `,
                attachments: [
                    {
                        filename: `comprobante_${payment.id}.${req.file.filename.split('.').pop()}`,
                        path: proofFilePath
                    }
                ]
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

// POST /approve-payment/:paymentId (Admin only - Approve and activate subscription)
router.post('/approve-payment/:paymentId', async (req, res) => {
    try {
        // Only SUPER_ADMIN can approve payments
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado. Solo administradores pueden aprobar pagos.' });
        }

        const { paymentId } = req.params;

        // Get payment with subscription and tenant info
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

        if (payment.status !== 'PENDING') {
            return res.status(400).json({ error: `El pago ya fue procesado. Estado actual: ${payment.status}` });
        }

        const plan = payment.plan;
        const planDetails = PLANS[plan];
        if (!planDetails) {
            return res.status(400).json({ error: 'Plan no válido' });
        }

        // Calculate subscription period
        const now = new Date();
        let periodEnd;
        if (payment.interval === 'yearly') {
            periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        } else if (payment.interval === 'quarterly') {
            periodEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        } else {
            periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        // Update payment status
        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'COMPLETED',
                verifiedAt: now,
                verifiedBy: req.user.userId
            }
        });

        // Activate subscription
        await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
                plan: plan,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                limits: JSON.stringify(planDetails.limits)
            }
        });

        // Log audit
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                tenantId: payment.subscription.tenantId,
                action: 'subscription.activated',
                resource: 'subscription',
                resourceId: payment.subscriptionId,
                details: { plan, interval: payment.interval, approvedBy: req.user.userId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // Send confirmation email to user
        const tenant = payment.subscription.tenant;
        const user = tenant?.users[0];

        if (user?.email) {
            try {
                await transporter.sendMail({
                    from: FROM_EMAIL,
                    to: user.email,
                    subject: `[PrestaPro] 🎉 ¡Tu ${planDetails.name} ha sido activado!`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px;">🎉 ¡Felicitaciones!</h1>
                                <p style="margin: 10px 0 0; font-size: 18px;">Tu plan ha sido activado</p>
                            </div>
                            
                            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                                <p style="font-size: 16px; color: #334155;">Hola ${user.name || 'Usuario'},</p>
                                
                                <p style="font-size: 16px; color: #334155;">
                                    Tu pago ha sido verificado y tu <strong style="color: #059669;">${planDetails.name}</strong> 
                                    ya está activo.
                                </p>
                                
                                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0 0 10px;"><strong>📋 Plan:</strong> ${planDetails.name}</p>
                                    <p style="margin: 0 0 10px;"><strong>📅 Válido hasta:</strong> ${periodEnd.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <p style="margin: 0;"><strong>✅ Características:</strong></p>
                                    <ul style="margin: 10px 0 0; padding-left: 20px;">
                                        ${planDetails.features.map(f => `<li>${f}</li>`).join('')}
                                    </ul>
                                </div>
                                
                                <div style="text-align: center; margin-top: 25px;">
                                    <a href="${process.env.APP_BASE_URL || 'https://prestanace.renace.tech'}" 
                                       style="display: inline-block; padding: 14px 40px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                        Ir a la Aplicación
                                    </a>
                                </div>
                                
                                <p style="margin-top: 30px; color: #64748b; font-size: 14px; text-align: center;">
                                    Gracias por confiar en PrestaPro 💙
                                </p>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('User activation email error:', emailErr);
            }
        }

        res.json({
            success: true,
            message: `Pago aprobado. Suscripción ${planDetails.name} activada hasta ${periodEnd.toLocaleDateString('es-DO')}.`,
            subscription: {
                plan,
                status: 'ACTIVE',
                currentPeriodEnd: periodEnd
            }
        });

    } catch (error) {
        console.error('Approve payment error:', error);
        res.status(500).json({ error: 'Error al aprobar pago' });
    }
});

// POST /reject-payment/:paymentId (Admin only - Reject payment)
router.post('/reject-payment/:paymentId', async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const { paymentId } = req.params;
        const { reason } = req.body;

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

        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'REJECTED',
                verifiedAt: new Date(),
                verifiedBy: req.user.userId,
                rejectedReason: reason || 'Sin especificar'
            }
        });

        // Send rejection email to user
        const user = payment.subscription.tenant?.users[0];
        if (user?.email) {
            try {
                await transporter.sendMail({
                    from: FROM_EMAIL,
                    to: user.email,
                    subject: `[PrestaPro] Pago no verificado`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2>Pago no verificado</h2>
                            <p>Hola ${user.name || ''},</p>
                            <p>Lamentamos informarte que tu comprobante de pago no pudo ser verificado.</p>
                            ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}
                            <p>Por favor sube un nuevo comprobante o contacta soporte.</p>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('Rejection email error:', emailErr);
            }
        }

        res.json({ success: true, message: 'Pago rechazado' });

    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ error: 'Error al rechazar pago' });
    }
});

module.exports = router;

