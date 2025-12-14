/**
 * Unified Notification Service
 * Creates in-app notification + sends push + optionally email
 * PrestaPro by Renace.tech
 */

const prisma = require('../lib/prisma');
const pushService = require('./pushService');
const emailService = require('./emailService');

/**
 * Create notification and send push
 * @param {Object} params
 * @param {string} params.tenantId - Required
 * @param {string} params.title - Required
 * @param {string} params.message - Required
 * @param {string} params.type - PAYMENT_DUE, PAYMENT_RECEIVED, REPORT, SYSTEM, SUBSCRIPTION, OVERDUE
 * @param {string} params.actionUrl - URL to navigate on click
 * @param {Object} params.data - Additional metadata
 * @param {boolean} params.sendPush - Send push notification (default: true)
 * @param {boolean} params.sendEmail - Send email notification (default: false)
 * @param {string} params.userId - Optional specific user
 */
const createNotification = async ({
    tenantId,
    title,
    message,
    type = 'SYSTEM',
    actionUrl = null,
    data = null,
    sendPush = true,
    sendEmail = false,
    userId = null
}) => {
    if (!tenantId || !title || !message) {
        console.error('[NOTIFY] Missing required fields:', { tenantId, title, message });
        return { success: false, error: 'Missing required fields' };
    }

    try {
        // 1. Create in-app notification
        const notification = await prisma.notification.create({
            data: {
                tenantId,
                userId,
                type,
                title,
                message,
                actionUrl,
                data,
                read: false
            }
        });

        console.log(`[NOTIFY] Created: "${title}" for tenant ${tenantId}`);

        // 2. Send push notification
        if (sendPush) {
            pushService.sendPushToTenant({
                tenantId,
                title,
                body: message,
                data: { type, url: actionUrl || '/' }
            }).catch(err => console.error('[NOTIFY] Push error:', err.message));
        }

        // 3. Send email if requested
        if (sendEmail) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true }
            });

            const user = await prisma.user.findFirst({
                where: { tenantId, role: { in: ['OWNER', 'ADMIN', 'owner', 'admin'] } },
                select: { email: true }
            });

            if (user?.email) {
                emailService.sendEmail({
                    to: user.email,
                    subject: title,
                    html: emailService.wrapEmailTemplate(`
                        <h2 style="color: #2563eb; margin-bottom: 16px;">${title}</h2>
                        <p style="color: #475569; line-height: 1.6;">${message}</p>
                        ${actionUrl ? `<p><a href="${actionUrl}" style="color: #2563eb;">Ver más →</a></p>` : ''}
                    `, tenant?.name || 'Presta Pro')
                }).catch(err => console.error('[NOTIFY] Email error:', err.message));
            }
        }

        return { success: true, notification };
    } catch (error) {
        console.error('[NOTIFY] Error:', error.message);
        return { success: false, error: error.message };
    }
};

// ============================================
// CONVENIENCE NOTIFICATION FUNCTIONS
// ============================================

/**
 * Payment received notification
 */
const notifyPaymentReceived = async ({ tenantId, clientName, amount, loanId }) => {
    return createNotification({
        tenantId,
        title: '💰 Pago Recibido',
        message: `${clientName} pagó RD$${parseFloat(amount).toLocaleString('es-DO')}`,
        type: 'PAYMENT_RECEIVED',
        actionUrl: loanId ? `/#/loans/${loanId}` : '/#/loans',
        sendPush: true
    });
};

/**
 * Overdue installment alert
 */
const notifyOverdue = async ({ tenantId, count, daysOverdue }) => {
    return createNotification({
        tenantId,
        title: '⚠️ Cuotas Vencidas',
        message: `Tienes ${count} cuota${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''} (${daysOverdue} días)`,
        type: 'OVERDUE',
        actionUrl: '/#/loans?status=OVERDUE',
        sendPush: true
    });
};

/**
 * New loan created notification
 */
const notifyLoanCreated = async ({ tenantId, clientName, amount }) => {
    return createNotification({
        tenantId,
        title: '📄 Nuevo Préstamo',
        message: `Préstamo de RD$${parseFloat(amount).toLocaleString('es-DO')} para ${clientName}`,
        type: 'SYSTEM',
        actionUrl: '/#/loans',
        sendPush: true
    });
};

/**
 * Subscription expiring warning
 */
const notifySubscriptionExpiring = async ({ tenantId, daysRemaining }) => {
    return createNotification({
        tenantId,
        title: '💳 Suscripción por Vencer',
        message: `Tu suscripción PRO vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Renueva para no perder acceso.`,
        type: 'SUBSCRIPTION',
        actionUrl: '/#/subscription',
        sendPush: true,
        sendEmail: daysRemaining <= 3  // Email only on last 3 days
    });
};

/**
 * Account suspended notification
 */
const notifySuspended = async ({ tenantId, reason }) => {
    return createNotification({
        tenantId,
        title: '🔴 Cuenta Suspendida',
        message: reason || 'Tu cuenta ha sido suspendida. Contacta al administrador.',
        type: 'SYSTEM',
        sendPush: true,
        sendEmail: true
    });
};

/**
 * Account activated notification
 */
const notifyActivated = async ({ tenantId }) => {
    return createNotification({
        tenantId,
        title: '🟢 Cuenta Activada',
        message: '¡Tu cuenta ha sido activada! Ya puedes usar todas las funciones.',
        type: 'SYSTEM',
        sendPush: true,
        sendEmail: true
    });
};

/**
 * Daily reminder - upcoming payments
 */
const notifyUpcomingPayments = async ({ tenantId, count, totalAmount }) => {
    return createNotification({
        tenantId,
        title: '📅 Pagos del Día',
        message: `Hoy tienes ${count} cuota${count > 1 ? 's' : ''} por cobrar (RD$${parseFloat(totalAmount).toLocaleString('es-DO')})`,
        type: 'PAYMENT_DUE',
        actionUrl: '/#/loans',
        sendPush: true
    });
};

/**
 * Broadcast to all tenants (admin only)
 */
const broadcastToAll = async ({ title, message, sendEmail = false }) => {
    try {
        const tenants = await prisma.tenant.findMany({
            where: { suspendedAt: null },
            select: { id: true }
        });

        const results = await Promise.allSettled(
            tenants.map(t => createNotification({
                tenantId: t.id,
                title,
                message,
                type: 'SYSTEM',
                sendPush: true,
                sendEmail
            }))
        );

        const success = results.filter(r => r.status === 'fulfilled').length;
        return { success: true, sent: success, total: tenants.length };
    } catch (error) {
        console.error('[BROADCAST] Error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    createNotification,
    // Convenience functions
    notifyPaymentReceived,
    notifyOverdue,
    notifyLoanCreated,
    notifySubscriptionExpiring,
    notifySuspended,
    notifyActivated,
    notifyUpcomingPayments,
    broadcastToAll
};
