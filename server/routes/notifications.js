/**
 * Notifications API Routes
 * PrestaPro by Renace.tech
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const emailService = require('../services/emailService');

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

/**
 * GET /api/notifications - Get notifications for current user/tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user?.userId;

        const notifications = await prisma.notification.findMany({
            where: {
                tenantId,
                OR: [
                    { userId: null },
                    { userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const unreadCount = notifications.filter(n => !n.read).length;

        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Error obteniendo notificaciones' });
    }
});

/**
 * POST /api/notifications/:id/read - Mark notification as read
 */
router.post('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json({ success: true, notification });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Error marcando notificación' });
    }
});

/**
 * POST /api/notifications/read-all - Mark all notifications as read
 */
router.post('/read-all', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user?.userId;

        await prisma.notification.updateMany({
            where: {
                tenantId,
                read: false,
                OR: [
                    { userId: null },
                    { userId }
                ]
            },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Error marcando notificaciones' });
    }
});

/**
 * DELETE /api/notifications/:id - Delete notification
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.notification.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Error eliminando notificación' });
    }
});

// ============================================
// EMAIL PREFERENCES ENDPOINTS
// ============================================

/**
 * GET /api/notifications/preferences - Get email preferences
 */
router.get('/preferences', async (req, res) => {
    try {
        const tenantId = req.tenantId;

        let prefs = await prisma.emailPreference.findUnique({
            where: { tenantId }
        });

        // Create default preferences if not exists
        if (!prefs) {
            prefs = await prisma.emailPreference.create({
                data: {
                    tenantId,
                    dailyReport: true,
                    weeklyReport: true,
                    monthlyReport: true,
                    paymentReminders: true,
                    overdueAlerts: true,
                    subscriptionAlerts: true,
                    reportHour: 8,
                    reminderDaysBefore: 3
                }
            });
        }

        res.json(prefs);
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Error obteniendo preferencias' });
    }
});

/**
 * PUT /api/notifications/preferences - Update email preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            dailyReport,
            weeklyReport,
            monthlyReport,
            paymentReminders,
            overdueAlerts,
            subscriptionAlerts,
            reportHour,
            reportEmail,
            reminderDaysBefore
        } = req.body;

        const prefs = await prisma.emailPreference.upsert({
            where: { tenantId },
            update: {
                dailyReport: dailyReport ?? undefined,
                weeklyReport: weeklyReport ?? undefined,
                monthlyReport: monthlyReport ?? undefined,
                paymentReminders: paymentReminders ?? undefined,
                overdueAlerts: overdueAlerts ?? undefined,
                subscriptionAlerts: subscriptionAlerts ?? undefined,
                reportHour: reportHour ?? undefined,
                reportEmail: reportEmail ?? undefined,
                reminderDaysBefore: reminderDaysBefore ?? undefined
            },
            create: {
                tenantId,
                dailyReport: dailyReport ?? true,
                weeklyReport: weeklyReport ?? true,
                monthlyReport: monthlyReport ?? true,
                paymentReminders: paymentReminders ?? true,
                overdueAlerts: overdueAlerts ?? true,
                subscriptionAlerts: subscriptionAlerts ?? true,
                reportHour: reportHour ?? 8,
                reportEmail,
                reminderDaysBefore: reminderDaysBefore ?? 3
            }
        });

        res.json({ success: true, preferences: prefs });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Error actualizando preferencias' });
    }
});

/**
 * POST /api/notifications/test-email - Send test email
 */
router.post('/test-email', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email requerido' });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        const result = await emailService.sendEmail({
            to: email,
            subject: 'Email de Prueba',
            html: emailService.wrapEmailTemplate(`
        <div style="text-align: center;">
          <h2 style="color: #0f172a;">✅ Prueba Exitosa</h2>
          <p style="color: #64748b;">Si recibes este correo, tu configuración de email está funcionando correctamente.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Enviado desde ${emailService.BRAND_NAME}</p>
        </div>
      `, tenant?.name || 'PrestaPro')
        });

        if (result.success) {
            res.json({ success: true, message: 'Email de prueba enviado' });
        } else {
            res.status(500).json({ error: result.error || 'Error enviando email' });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: 'Error enviando email de prueba' });
    }
});

module.exports = router;
