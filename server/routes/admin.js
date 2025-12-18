/**
 * Admin Panel API Routes
 * PrestaPro by Renace.tech
 * 
 * These routes are for system administrators only (role: 'admin' or 'ADMIN')
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const emailService = require('../services/emailService');

// Admin middleware - check if user is system admin
const requireAdmin = (req, res, next) => {
    const role = req.user?.role?.toUpperCase();
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};

// Apply to all routes
router.use(requireAdmin);

// ============================================
// DASHBOARD / STATS
// ============================================

/**
 * GET /api/admin/dashboard - Get global stats
 */
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Tenants stats
        const totalTenants = await prisma.tenant.count();
        const activeTenants = await prisma.tenant.count({
            where: { suspendedAt: null }
        });
        const newTenantsThisMonth = await prisma.tenant.count({
            where: { createdAt: { gte: startOfMonth } }
        });

        // Subscriptions stats
        const activeSubscriptions = await prisma.subscription.count({
            where: { status: 'ACTIVE' }
        });
        const pendingPayments = await prisma.payment.count({
            where: { status: 'PENDING' }
        });

        // Revenue this month
        const monthlyPayments = await prisma.payment.findMany({
            where: {
                status: 'VERIFIED',
                createdAt: { gte: startOfMonth }
            },
            select: { amount: true }
        });
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

        // Plan distribution
        const planDistribution = await prisma.subscription.groupBy({
            by: ['plan'],
            _count: { plan: true }
        });

        res.json({
            tenants: {
                total: totalTenants,
                active: activeTenants,
                suspended: totalTenants - activeTenants,
                newThisMonth: newTenantsThisMonth
            },
            subscriptions: {
                active: activeSubscriptions,
                pendingPayments
            },
            revenue: {
                thisMonth: monthlyRevenue
            },
            planDistribution: planDistribution.map(p => ({
                plan: p.plan,
                count: p._count.plan
            }))
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// ============================================
// TENANTS MANAGEMENT
// ============================================

/**
 * GET /api/admin/tenants - List all tenants
 */
router.get('/tenants', async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        const where = {};

        if (status === 'active') {
            where.suspendedAt = null;
        } else if (status === 'suspended') {
            where.suspendedAt = { not: null };
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    subscription: {
                        select: { plan: true, status: true, currentPeriodEnd: true }
                    },
                    users: {
                        select: { id: true, email: true, name: true, role: true },
                        take: 5
                    },
                    _count: {
                        select: { clients: true, loans: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            }),
            prisma.tenant.count({ where })
        ]);

        res.json({
            tenants,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('List tenants error:', error);
        res.status(500).json({ error: 'Error listando empresas' });
    }
});

/**
 * GET /api/admin/tenants/:id - Get tenant details
 */
router.get('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } }
                },
                users: true,
                _count: {
                    select: { clients: true, loans: true, receipts: true, collectors: true }
                }
            }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        res.json(tenant);
    } catch (error) {
        console.error('Get tenant error:', error);
        res.status(500).json({ error: 'Error obteniendo empresa' });
    }
});

/**
 * POST /api/admin/tenants/:id/suspend - Suspend tenant
 */
router.post('/tenants/:id/suspend', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const tenant = await prisma.tenant.update({
            where: { id },
            data: {
                suspendedAt: new Date(),
                suspendedBy: req.user?.id || req.user?.userId,
                suspendReason: reason || 'Suspendido por administrador'
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'SUSPEND_TENANT',
                targetType: 'TENANT',
                targetId: id,
                reason,
                ipAddress: req.ip
            }
        });

        // Get tenant owner/admin email and send suspension notification
        // First try to find owner/admin, then fall back to any user
        let tenantOwner = await prisma.user.findFirst({
            where: {
                tenantId: id,
                role: { in: ['ADMIN', 'OWNER', 'admin', 'owner', 'SUPER_ADMIN'] }
            },
            select: { email: true, name: true, role: true }
        });

        // If no owner found, get ANY user from this tenant
        if (!tenantOwner) {
            tenantOwner = await prisma.user.findFirst({
                where: { tenantId: id },
                select: { email: true, name: true, role: true }
            });
        }

        console.log(`[SUSPEND] Tenant ${id} - Found user:`, tenantOwner ? tenantOwner.email : 'NO USER FOUND');

        if (tenantOwner?.email) {
            const suspensionReason = reason || 'Suspendido por administrador';
            console.log(`[SUSPEND] Sending email to ${tenantOwner.email}...`);
            await emailService.sendEmail({
                to: tenantOwner.email,
                subject: '⚠️ Tu cuenta ha sido suspendida - RenKredit',
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #dc2626; margin-bottom: 20px;">Cuenta Suspendida</h2>
                    <p>Hola ${tenantOwner.name || 'Usuario'},</p>
                    <p>Tu cuenta en <strong>RenKredit</strong> ha sido suspendida.</p>
                    
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong></p>
                        <p style="margin: 5px 0 0; color: #7f1d1d;">${suspensionReason}</p>
                    </div>
                    
                    <p>Mientras tu cuenta esté suspendida, no podrás acceder al sistema.</p>
                    <p>Si crees que esto es un error o deseas resolver esta situación, por favor contacta a soporte:</p>
                    <p><a href="mailto:soporte@renace.tech" style="color: #2563eb;">soporte@renace.tech</a></p>
                `)
            }).then(() => {
                console.log(`[SUSPEND] Email sent successfully to ${tenantOwner.email}`);
            }).catch(err => {
                console.error('[SUSPEND] Error sending suspension email:', err.message || err);
            });
        } else {
            console.warn(`[SUSPEND] No user email found for tenant ${id}`);
        }

        // Create in-app notification for the suspended tenant
        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SYSTEM',
                title: '⚠️ Cuenta Suspendida',
                message: `Tu cuenta ha sido suspendida. Motivo: ${reason || 'Suspendido por administrador'}. Contacta soporte para más información.`
            }
        }).catch(err => console.error('Error creating tenant notification:', err));

        // Create in-app notification for super admin (you) - stored in the tenant's notifications
        await prisma.notification.create({
            data: {
                tenantId: id, // Use suspended tenant's ID (required field)
                userId: req.user?.id || req.user?.userId,
                type: 'ADMIN',
                title: '🔴 Cuenta Suspendida',
                message: `Has suspendido la cuenta de "${tenant.name}". Motivo: ${reason || 'Suspendido por administrador'}`
            }
        }).catch(err => console.error('Error creating admin notification:', err));

        res.json({ success: true, tenant });
    } catch (error) {
        console.error('Suspend tenant error:', error);
        res.status(500).json({ error: 'Error suspendiendo empresa' });
    }
});

/**
 * POST /api/admin/tenants/:id/activate - Activate suspended tenant
 */
router.post('/tenants/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await prisma.tenant.update({
            where: { id },
            data: {
                suspendedAt: null,
                suspendedBy: null,
                suspendReason: null
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'ACTIVATE_TENANT',
                targetType: 'TENANT',
                targetId: id,
                ipAddress: req.ip
            }
        });

        // Get tenant owner/admin email and send activation notification
        const tenantOwner = await prisma.user.findFirst({
            where: {
                tenantId: id,
                role: { in: ['ADMIN', 'OWNER', 'admin', 'owner'] }
            },
            select: { email: true, name: true }
        });

        if (tenantOwner?.email) {
            await emailService.sendEmail({
                to: tenantOwner.email,
                subject: '✅ Tu cuenta ha sido reactivada - RenKredit',
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #16a34a; margin-bottom: 20px;">¡Tu Cuenta Está Activa!</h2>
                    <p>Hola ${tenantOwner.name || 'Usuario'},</p>
                    <p>Tu cuenta en <strong>RenKredit</strong> ha sido reactivada correctamente.</p>
                    
                    <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #166534;">Ya puedes acceder normalmente al sistema con tus credenciales habituales.</p>
                    </div>
                    
                    <p>¡Gracias por confiar en nosotros!</p>
                    <p><a href="https://renkredit.renace.tech" style="color: #2563eb;">Ir a RenKredit</a></p>
                `)
            }).catch(err => console.error('Error sending activation email:', err));
        }

        // Create in-app notification for the reactivated tenant
        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SYSTEM',
                title: '✅ Cuenta Reactivada',
                message: '¡Tu cuenta ha sido reactivada! Ya puedes acceder normalmente al sistema.'
            }
        }).catch(err => console.error('Error creating tenant notification:', err));

        // Create in-app notification for super admin (you) - stored in the tenant's notifications
        await prisma.notification.create({
            data: {
                tenantId: id, // Use tenant's ID (required field)
                userId: req.user?.id || req.user?.userId,
                type: 'ADMIN',
                title: '🟢 Cuenta Reactivada',
                message: `Has reactivado la cuenta de "${tenant.name}".`
            }
        }).catch(err => console.error('Error creating admin notification:', err));

        res.json({ success: true, tenant });
    } catch (error) {
        console.error('Activate tenant error:', error);
        res.status(500).json({ error: 'Error activando empresa' });
    }
});

/**
 * PUT /api/admin/tenants/:id/notes - Update admin notes
 */
router.put('/tenants/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, tags } = req.body;

        const tenant = await prisma.tenant.update({
            where: { id },
            data: {
                adminNotes: notes,
                tags: tags || undefined
            }
        });

        res.json({ success: true, tenant });
    } catch (error) {
        console.error('Update notes error:', error);
        res.status(500).json({ error: 'Error actualizando notas' });
    }
});

// ============================================
// PAYMENTS VERIFICATION
// ============================================

/**
 * GET /api/admin/payments/pending - Get pending payments to verify
 */
router.get('/payments/pending', async (req, res) => {
    try {
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
        res.status(500).json({ error: 'Error obteniendo pagos' });
    }
});

/**
 * POST /api/admin/payments/:id/verify - Verify payment
 */
router.post('/payments/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: {
                        tenant: { include: { users: true } }
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        // Update payment status
        await prisma.payment.update({
            where: { id },
            data: {
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: req.user.userId
            }
        });

        // Update subscription
        const periodEnd = new Date();
        if (payment.interval === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
                status: 'ACTIVE',
                plan: payment.plan,
                currentPeriodStart: new Date(),
                currentPeriodEnd: periodEnd
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.userId,
                adminEmail: req.user.email || 'admin',
                action: 'VERIFY_PAYMENT',
                targetType: 'PAYMENT',
                targetId: id,
                newValue: { plan: payment.plan, amount: payment.amount, periodEnd: periodEnd.toISOString() },
                ipAddress: req.ip
            }
        });

        // Send confirmation email
        const user = payment.subscription.tenant.users.find(u => u.email);
        if (user?.email) {
            // Email would be sent here
            console.log(`Payment verified email would be sent to ${user.email}`);
        }

        res.json({ success: true, message: 'Pago verificado exitosamente' });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Error verificando pago' });
    }
});

/**
 * POST /api/admin/payments/:id/reject - Reject payment
 */
router.post('/payments/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Razón de rechazo requerida' });
        }

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: {
                        tenant: { include: { users: true } }
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        await prisma.payment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: reason
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.userId,
                adminEmail: req.user.email || 'admin',
                action: 'REJECT_PAYMENT',
                targetType: 'PAYMENT',
                targetId: id,
                reason,
                ipAddress: req.ip
            }
        });

        res.json({ success: true, message: 'Pago rechazado' });
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ error: 'Error rechazando pago' });
    }
});

// ============================================
// AUDIT LOGS
// ============================================

/**
 * GET /api/admin/logs - Get audit logs
 */
router.get('/logs', async (req, res) => {
    try {
        const { action, targetType, page = 1, limit = 50 } = req.query;

        const where = {};
        if (action) where.action = action;
        if (targetType) where.targetType = targetType;

        const [logs, total] = await Promise.all([
            prisma.adminLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            }),
            prisma.adminLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Error obteniendo logs' });
    }
});

// ============================================
// BROADCAST NOTIFICATIONS
// ============================================

/**
 * POST /api/admin/broadcast - Send notification to all tenants
 * Body: { title, message, type, sendEmail }
 */
router.post('/broadcast', async (req, res) => {
    try {
        const { title, message, type = 'SYSTEM', sendEmail = false } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Se requiere título y mensaje' });
        }

        // Get all active tenants
        const tenants = await prisma.tenant.findMany({
            where: { suspendedAt: null },
            select: { id: true, name: true }
        });

        console.log(`[BROADCAST] Starting broadcast to ${tenants.length} tenants`);
        console.log(`[BROADCAST] Title: ${title}`);
        console.log(`[BROADCAST] SendEmail: ${sendEmail}`);

        let notificationsCreated = 0;
        let emailsSent = 0;
        let emailsFailed = 0;

        for (const tenant of tenants) {
            try {
                // Create in-app notification for each tenant
                await prisma.notification.create({
                    data: {
                        tenantId: tenant.id,
                        type,
                        title,
                        message
                    }
                });
                notificationsCreated++;

                // Optionally send email to tenant owner (with timeout)
                if (sendEmail) {
                    const tenantUser = await prisma.user.findFirst({
                        where: { tenantId: tenant.id },
                        select: { email: true, name: true }
                    });

                    if (tenantUser?.email) {
                        try {
                            // Send with 10 second timeout
                            const emailPromise = emailService.sendEmail({
                                to: tenantUser.email,
                                subject: title,
                                html: emailService.wrapEmailTemplate(`
                                    <h2 style="color: #2563eb; margin-bottom: 20px;">📢 ${title}</h2>
                                    <p>${message}</p>
                                `, tenant.name)
                            });

                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Email timeout')), 10000)
                            );

                            const result = await Promise.race([emailPromise, timeoutPromise]);
                            if (result?.success) {
                                emailsSent++;
                            } else {
                                emailsFailed++;
                            }
                        } catch (emailErr) {
                            console.error(`[BROADCAST] Email failed for ${tenantUser.email}:`, emailErr.message);
                            emailsFailed++;
                        }
                    }
                }
            } catch (tenantErr) {
                console.error(`[BROADCAST] Error for tenant ${tenant.id}:`, tenantErr.message);
            }
        }

        // Log the action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user?.email || 'admin',
                action: 'BROADCAST_NOTIFICATION',
                targetType: 'ALL_TENANTS',
                reason: `${title}: ${message.substring(0, 100)}`,
                ipAddress: req.ip
            }
        });

        console.log(`[BROADCAST] Complete: ${notificationsCreated} notifications, ${emailsSent} emails sent, ${emailsFailed} emails failed`);

        res.json({
            success: true,
            stats: {
                tenants: tenants.length,
                notificationsCreated,
                emailsSent,
                emailsFailed
            }
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'Error enviando broadcast' });
    }
});

// ============================================
// PLAN & SUBSCRIPTION MANAGEMENT
// ============================================

// Plan definitions (same as subscriptions.js)
const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Gratis',
        limits: { maxClients: 10, maxLoans: 5, maxUsers: 1, aiQueries: 0 }
    },
    PRO: {
        id: 'PRO',
        name: 'Plan Profesional',
        limits: { maxClients: 100, maxLoans: 50, maxUsers: 5, aiQueries: 100 }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        limits: { maxClients: -1, maxLoans: -1, maxUsers: -1, aiQueries: -1 }
    }
};

/**
 * PUT /api/admin/tenants/:id/plan - Change tenant's subscription plan
 * Body: { plan: 'FREE'|'PRO'|'ENTERPRISE', months: 1|3|6|12, reason: string }
 */
router.put('/tenants/:id/plan', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, months = 1, reason } = req.body;

        if (!PLANS[plan]) {
            return res.status(400).json({ error: 'Plan inválido. Use FREE, PRO o ENTERPRISE.' });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: { subscription: true, users: true }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const previousPlan = tenant.subscription?.plan || 'FREE';
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + parseInt(months));

        // Update or create subscription
        const subscription = await prisma.subscription.upsert({
            where: { tenantId: id },
            update: {
                plan,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                limits: JSON.stringify(PLANS[plan].limits)
            },
            create: {
                tenantId: id,
                plan,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                limits: JSON.stringify(PLANS[plan].limits)
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'CHANGE_PLAN',
                targetType: 'SUBSCRIPTION',
                targetId: id,
                previousValue: { plan: previousPlan },
                newValue: { plan, months, periodEnd: periodEnd.toISOString() },
                reason: reason || `Cambio de plan a ${plan}`,
                ipAddress: req.ip
            }
        });

        // Send email notification to tenant
        const tenantUser = tenant.users.find(u => u.email);
        if (tenantUser?.email) {
            await emailService.sendEmail({
                to: tenantUser.email,
                subject: `📋 Tu plan ha sido actualizado a ${PLANS[plan].name} - RenKredit`,
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #059669; margin-bottom: 20px;">Plan Actualizado</h2>
                    <p>Hola ${tenantUser.name || 'Usuario'},</p>
                    <p>Tu plan en <strong>RenKredit</strong> ha sido actualizado por un administrador.</p>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0 0 10px;"><strong>Plan anterior:</strong> ${previousPlan}</p>
                        <p style="margin: 0 0 10px;"><strong>Nuevo plan:</strong> ${PLANS[plan].name}</p>
                        <p style="margin: 0;"><strong>Válido hasta:</strong> ${periodEnd.toLocaleDateString('es-DO')}</p>
                    </div>
                    
                    ${reason ? `<p><strong>Nota:</strong> ${reason}</p>` : ''}
                    <p>¡Gracias por confiar en nosotros!</p>
                `)
            }).catch(err => console.error('Error sending plan change email:', err));
        }

        // Create notification
        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SUBSCRIPTION',
                title: '📋 Plan Actualizado',
                message: `Tu plan ha sido actualizado a ${PLANS[plan].name}. Válido hasta ${periodEnd.toLocaleDateString('es-DO')}.`
            }
        });

        res.json({
            success: true,
            message: `Plan actualizado a ${PLANS[plan].name}`,
            subscription: {
                plan,
                status: 'ACTIVE',
                currentPeriodEnd: periodEnd
            }
        });
    } catch (error) {
        console.error('Change plan error:', error);
        res.status(500).json({ error: 'Error actualizando plan' });
    }
});

/**
 * POST /api/admin/tenants/:id/extend - Extend subscription period
 * Body: { days: number, reason: string }
 */
router.post('/tenants/:id/extend', async (req, res) => {
    try {
        const { id } = req.params;
        const { days, reason } = req.body;

        if (!days || days < 1) {
            return res.status(400).json({ error: 'Debe especificar días válidos (mínimo 1)' });
        }

        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: id },
            include: { tenant: { include: { users: true } } }
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Suscripción no encontrada' });
        }

        // Calculate new end date
        const currentEnd = subscription.currentPeriodEnd || new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + parseInt(days));

        await prisma.subscription.update({
            where: { tenantId: id },
            data: {
                currentPeriodEnd: newEnd,
                status: 'ACTIVE'
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'EXTEND_SUBSCRIPTION',
                targetType: 'SUBSCRIPTION',
                targetId: id,
                previousValue: { periodEnd: currentEnd.toISOString() },
                newValue: { periodEnd: newEnd.toISOString(), daysAdded: days },
                reason: reason || `Extensión de ${days} días`,
                ipAddress: req.ip
            }
        });

        // Notify tenant
        const tenantUser = subscription.tenant?.users.find(u => u.email);
        if (tenantUser?.email) {
            await emailService.sendEmail({
                to: tenantUser.email,
                subject: '⏰ Tu suscripción ha sido extendida - RenKredit',
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #2563eb; margin-bottom: 20px;">Suscripción Extendida</h2>
                    <p>¡Buenas noticias! Tu suscripción ha sido extendida.</p>
                    
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0 0 10px;"><strong>Días agregados:</strong> ${days}</p>
                        <p style="margin: 0;"><strong>Nueva fecha de vencimiento:</strong> ${newEnd.toLocaleDateString('es-DO')}</p>
                    </div>
                    
                    ${reason ? `<p><strong>Nota:</strong> ${reason}</p>` : ''}
                `)
            }).catch(err => console.error('Error sending extension email:', err));
        }

        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SUBSCRIPTION',
                title: '⏰ Suscripción Extendida',
                message: `Se han agregado ${days} días a tu suscripción. Nueva fecha de vencimiento: ${newEnd.toLocaleDateString('es-DO')}.`
            }
        });

        res.json({
            success: true,
            message: `Suscripción extendida ${days} días`,
            newPeriodEnd: newEnd
        });
    } catch (error) {
        console.error('Extend subscription error:', error);
        res.status(500).json({ error: 'Error extendiendo suscripción' });
    }
});

/**
 * POST /api/admin/tenants/:id/reset-password - Reset user password
 * Body: { userId?: string } - If not provided, resets admin/owner's password
 */
router.post('/tenants/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const bcrypt = require('bcrypt');

        // Find user
        let user;
        if (userId) {
            user = await prisma.user.findFirst({
                where: { id: userId, tenantId: id }
            });
        } else {
            user = await prisma.user.findFirst({
                where: {
                    tenantId: id,
                    role: { in: ['ADMIN', 'OWNER', 'admin', 'owner', 'SUPER_ADMIN'] }
                }
            });
            // Fallback to any user
            if (!user) {
                user = await prisma.user.findFirst({ where: { tenantId: id } });
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'RESET_PASSWORD',
                targetType: 'USER',
                targetId: user.id,
                reason: `Contraseña reseteada por admin`,
                ipAddress: req.ip
            }
        });

        // Send email with new password
        if (user.email) {
            await emailService.sendEmail({
                to: user.email,
                subject: '🔑 Tu contraseña ha sido restablecida - RenKredit',
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #dc2626; margin-bottom: 20px;">Contraseña Restablecida</h2>
                    <p>Hola ${user.name || 'Usuario'},</p>
                    <p>Un administrador ha restablecido tu contraseña.</p>
                    
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0 0 10px; color: #991b1b;"><strong>Tu nueva contraseña temporal:</strong></p>
                        <p style="margin: 0; font-size: 24px; font-family: monospace; background: #fee2e2; padding: 10px; border-radius: 4px;">${tempPassword}</p>
                    </div>
                    
                    <p style="color: #dc2626;"><strong>⚠️ Por seguridad, cambia esta contraseña inmediatamente después de iniciar sesión.</strong></p>
                    <p><a href="${process.env.APP_URL || 'https://prestapro.renace.tech'}" style="color: #2563eb;">Ir a RenKredit</a></p>
                `)
            }).catch(err => console.error('Error sending password reset email:', err));
        }

        res.json({
            success: true,
            message: `Contraseña restablecida para ${user.email}`,
            email: user.email
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Error restableciendo contraseña' });
    }
});

/**
 * POST /api/admin/tenants/:id/send-email - Send direct email to tenant
 * Body: { subject: string, message: string }
 */
router.post('/tenants/:id/send-email', async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Asunto y mensaje son requeridos' });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: { users: true }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const tenantUser = tenant.users.find(u => u.email);
        if (!tenantUser?.email) {
            return res.status(400).json({ error: 'El tenant no tiene email configurado' });
        }

        await emailService.sendEmail({
            to: tenantUser.email,
            subject: `[RenKredit Admin] ${subject}`,
            html: emailService.wrapEmailTemplate(`
                <h2 style="color: #1e40af; margin-bottom: 20px;">Mensaje del Administrador</h2>
                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                    Este mensaje fue enviado por el equipo de administración de RenKredit.
                </p>
            `, tenant.name)
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'SEND_EMAIL',
                targetType: 'TENANT',
                targetId: id,
                reason: `Email enviado: ${subject}`,
                ipAddress: req.ip
            }
        });

        // Also create in-app notification
        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SYSTEM',
                title: '📧 ' + subject,
                message: message.substring(0, 500)
            }
        });

        res.json({
            success: true,
            message: `Email enviado a ${tenantUser.email}`
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Error enviando email' });
    }
});

/**
 * GET /api/admin/tenants/:id/history - Get admin action history for tenant
 */
router.get('/tenants/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const [logs, total] = await Promise.all([
            prisma.adminLog.findMany({
                where: { targetId: id },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            }),
            prisma.adminLog.count({ where: { targetId: id } })
        ]);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Error obteniendo historial' });
    }
});

/**
 * POST /api/admin/tenants/:id/downgrade - Downgrade tenant to FREE plan immediately
 * Body: { reason: string }
 */
router.post('/tenants/:id/downgrade', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: id },
            include: { tenant: { include: { users: true } } }
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Suscripción no encontrada' });
        }

        const previousPlan = subscription.plan;

        if (previousPlan === 'FREE') {
            return res.status(400).json({ error: 'El tenant ya tiene el plan gratuito' });
        }

        // Downgrade to FREE with 30-day trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        await prisma.subscription.update({
            where: { tenantId: id },
            data: {
                plan: 'FREE',
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEnd,
                trialEndsAt: trialEnd,
                limits: JSON.stringify(PLANS.FREE.limits)
            }
        });

        // Log action
        await prisma.adminLog.create({
            data: {
                adminId: req.user?.id || req.user?.userId,
                adminEmail: req.user.email || 'admin',
                action: 'DOWNGRADE_PLAN',
                targetType: 'SUBSCRIPTION',
                targetId: id,
                previousValue: { plan: previousPlan },
                newValue: { plan: 'FREE' },
                reason: reason || 'Degradado a plan gratuito',
                ipAddress: req.ip
            }
        });

        // Notify tenant
        const tenantUser = subscription.tenant?.users.find(u => u.email);
        if (tenantUser?.email) {
            await emailService.sendEmail({
                to: tenantUser.email,
                subject: '⚠️ Tu plan ha sido modificado - RenKredit',
                html: emailService.wrapEmailTemplate(`
                    <h2 style="color: #d97706; margin-bottom: 20px;">Plan Actualizado</h2>
                    <p>Hola ${tenantUser.name || 'Usuario'},</p>
                    <p>Tu plan en RenKredit ha sido modificado.</p>
                    
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0 0 10px;"><strong>Plan anterior:</strong> ${previousPlan}</p>
                        <p style="margin: 0 0 10px;"><strong>Nuevo plan:</strong> Gratis</p>
                        <p style="margin: 0;"><strong>Límites actuales:</strong> 10 clientes, 5 préstamos</p>
                    </div>
                    
                    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
                    <p>Si tienes preguntas, contacta a soporte.</p>
                `)
            }).catch(err => console.error('Error sending downgrade email:', err));
        }

        await prisma.notification.create({
            data: {
                tenantId: id,
                type: 'SUBSCRIPTION',
                title: '⚠️ Plan Modificado',
                message: `Tu plan ha sido cambiado a Gratis. ${reason || 'Contacta soporte para más información.'}`
            }
        });

        res.json({
            success: true,
            message: 'Plan degradado a FREE',
            previousPlan
        });
    } catch (error) {
        console.error('Downgrade error:', error);
        res.status(500).json({ error: 'Error degradando plan' });
    }
});

module.exports = router;
