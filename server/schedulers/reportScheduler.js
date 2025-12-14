/**
 * Report Scheduler - Automated email reports
 * PrestaPro by Renace.tech
 * 
 * Runs scheduled jobs to send daily, weekly, and monthly reports
 * based on each tenant's EmailPreference configuration.
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const emailService = require('../services/emailService');

/**
 * Calculate report statistics for a tenant
 */
async function calculateReportStats(tenantId, startDate, endDate) {
    try {
        // Get receipts (payments collected)
        const receipts = await prisma.receipt.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get expenses
        const expenses = await prisma.expense.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Get overdue loans
        const today = new Date();
        const overdueLoans = await prisma.loan.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
                schedule: {
                    path: '$[*].status',
                    array_contains: 'PENDING'
                }
            },
            include: {
                client: { select: { name: true } }
            }
        });

        // Calculate totals
        const totalCollected = receipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const balance = totalCollected - totalExpenses;

        // Count overdue installments
        let overdueCount = 0;
        overdueLoans.forEach(loan => {
            if (Array.isArray(loan.schedule)) {
                loan.schedule.forEach(inst => {
                    if (inst.status !== 'PAID' && new Date(inst.date) < today) {
                        overdueCount++;
                    }
                });
            }
        });

        return {
            totalCollected,
            totalExpenses,
            balance,
            receiptsCount: receipts.length,
            overdueCount
        };
    } catch (error) {
        console.error('Error calculating report stats:', error);
        return {
            totalCollected: 0,
            totalExpenses: 0,
            balance: 0,
            receiptsCount: 0,
            overdueCount: 0
        };
    }
}

/**
 * Send daily report to a tenant
 */
async function sendDailyReportForTenant(tenant, prefs) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const stats = await calculateReportStats(tenant.id, today, tomorrow);

        // Get email recipient
        const targetEmail = prefs.reportEmail || (await getAdminEmail(tenant.id));
        if (!targetEmail) {
            console.log(`No email for tenant ${tenant.id}, skipping daily report`);
            return;
        }

        await emailService.sendDailyReport({
            to: targetEmail,
            tenantName: tenant.name,
            date: today,
            stats
        });

        console.log(`✅ Daily report sent to ${targetEmail} for tenant ${tenant.name}`);

        // Create in-app notification
        await emailService.createNotification({
            tenantId: tenant.id,
            type: 'REPORT',
            title: 'Reporte Diario Enviado',
            message: `Reporte del ${today.toLocaleDateString('es-DO')} enviado a ${targetEmail}`
        });

    } catch (error) {
        console.error(`Error sending daily report for tenant ${tenant.id}:`, error);
    }
}

/**
 * Get admin email for a tenant
 */
async function getAdminEmail(tenantId) {
    const admin = await prisma.user.findFirst({
        where: {
            tenantId,
            role: { in: ['ADMIN', 'OWNER', 'SUPER_ADMIN'] }
        },
        select: { email: true }
    });
    return admin?.email || null;
}

/**
 * Process all tenants for a specific report type
 */
async function processReports(reportType) {
    console.log(`📧 Processing ${reportType} reports...`);
    const currentHour = new Date().getHours();

    try {
        // Get all email preferences with the report type enabled
        const prefField = `${reportType}Report`;
        const preferences = await prisma.emailPreference.findMany({
            where: {
                [prefField]: true,
                reportHour: currentHour
            },
            include: {
                tenant: true
            }
        });

        console.log(`Found ${preferences.length} tenants with ${reportType} reports enabled at hour ${currentHour}`);

        for (const pref of preferences) {
            if (!pref.tenant || pref.tenant.suspendedAt) continue;

            if (reportType === 'daily') {
                await sendDailyReportForTenant(pref.tenant, pref);
            } else if (reportType === 'weekly') {
                // Only send on Mondays
                if (new Date().getDay() === 1) {
                    await sendWeeklyReportForTenant(pref.tenant, pref);
                }
            } else if (reportType === 'monthly') {
                // Only send on 1st of month
                if (new Date().getDate() === 1) {
                    await sendMonthlyReportForTenant(pref.tenant, pref);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing ${reportType} reports:`, error);
    }
}

/**
 * Send weekly report to a tenant
 */
async function sendWeeklyReportForTenant(tenant, prefs) {
    try {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        const stats = await calculateReportStats(tenant.id, startOfWeek, today);

        const targetEmail = prefs.reportEmail || (await getAdminEmail(tenant.id));
        if (!targetEmail) return;

        // Use daily report template with weekly data
        await emailService.sendDailyReport({
            to: targetEmail,
            tenantName: tenant.name,
            date: startOfWeek,
            stats
        });

        console.log(`✅ Weekly report sent to ${targetEmail} for tenant ${tenant.name}`);

        await emailService.createNotification({
            tenantId: tenant.id,
            type: 'REPORT',
            title: 'Reporte Semanal Enviado',
            message: `Reporte semanal enviado a ${targetEmail}`
        });

    } catch (error) {
        console.error(`Error sending weekly report for tenant ${tenant.id}:`, error);
    }
}

/**
 * Send monthly report to a tenant
 */
async function sendMonthlyReportForTenant(tenant, prefs) {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const stats = await calculateReportStats(tenant.id, startOfMonth, endOfMonth);

        const targetEmail = prefs.reportEmail || (await getAdminEmail(tenant.id));
        if (!targetEmail) return;

        await emailService.sendDailyReport({
            to: targetEmail,
            tenantName: tenant.name,
            date: startOfMonth,
            stats
        });

        console.log(`✅ Monthly report sent to ${targetEmail} for tenant ${tenant.name}`);

        await emailService.createNotification({
            tenantId: tenant.id,
            type: 'REPORT',
            title: 'Reporte Mensual Enviado',
            message: `Reporte mensual enviado a ${targetEmail}`
        });

    } catch (error) {
        console.error(`Error sending monthly report for tenant ${tenant.id}:`, error);
    }
}

/**
 * Process payment reminders
 * Sends reminders to clients with payments due soon
 */
async function processPaymentReminders() {
    console.log('⏰ Processing payment reminders...');

    try {
        const preferences = await prisma.emailPreference.findMany({
            where: { paymentReminders: true },
            include: { tenant: true }
        });

        const today = new Date();

        for (const pref of preferences) {
            if (!pref.tenant || pref.tenant.suspendedAt) continue;

            const reminderDate = new Date(today);
            reminderDate.setDate(reminderDate.getDate() + (pref.reminderDaysBefore || 3));

            // Find loans with installments due in X days
            const loans = await prisma.loan.findMany({
                where: {
                    tenantId: pref.tenant.id,
                    status: 'ACTIVE'
                },
                include: {
                    client: true
                }
            });

            for (const loan of loans) {
                if (!Array.isArray(loan.schedule)) continue;

                const pendingInstallment = loan.schedule.find(inst => {
                    if (inst.status === 'PAID') return false;
                    const dueDate = new Date(inst.date);
                    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    return diffDays === (pref.reminderDaysBefore || 3);
                });

                if (pendingInstallment && loan.client?.email) {
                    // Create in-app notification
                    await emailService.createNotification({
                        tenantId: pref.tenant.id,
                        type: 'PAYMENT_DUE',
                        title: `Pago próximo: ${loan.client.name}`,
                        message: `Cuota de RD$${pendingInstallment.payment?.toLocaleString()} vence en ${pref.reminderDaysBefore || 3} días`
                    });

                    // Send email if client has email
                    await emailService.sendPaymentReminder({
                        to: loan.client.email,
                        tenantName: pref.tenant.name,
                        clientName: loan.client.name,
                        amount: pendingInstallment.payment,
                        dueDate: pendingInstallment.date,
                        daysUntilDue: pref.reminderDaysBefore || 3
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error processing payment reminders:', error);
    }
}

/**
 * Process overdue alerts
 * Sends alerts for overdue payments
 */
async function processOverdueAlerts() {
    console.log('⚠️ Processing overdue alerts...');

    try {
        const preferences = await prisma.emailPreference.findMany({
            where: { overdueAlerts: true },
            include: { tenant: true }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const pref of preferences) {
            if (!pref.tenant || pref.tenant.suspendedAt) continue;

            const loans = await prisma.loan.findMany({
                where: {
                    tenantId: pref.tenant.id,
                    status: 'ACTIVE'
                },
                include: {
                    client: true
                }
            });

            let overdueCount = 0;
            for (const loan of loans) {
                if (!Array.isArray(loan.schedule)) continue;

                const overdueInstallments = loan.schedule.filter(inst => {
                    if (inst.status === 'PAID') return false;
                    const dueDate = new Date(inst.date);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today;
                });

                if (overdueInstallments.length > 0) {
                    overdueCount += overdueInstallments.length;
                }
            }

            if (overdueCount > 0) {
                // Create notification for admin
                await emailService.createNotification({
                    tenantId: pref.tenant.id,
                    type: 'OVERDUE',
                    title: `${overdueCount} cuotas vencidas`,
                    message: `Tienes ${overdueCount} cuotas vencidas pendientes de cobro`
                });
            }
        }
    } catch (error) {
        console.error('Error processing overdue alerts:', error);
    }
}

/**
 * Initialize all schedulers
 */
function initializeSchedulers() {
    console.log('🕐 Initializing report schedulers...');

    // Run every hour at minute 0 to process reports
    // This checks all tenants and sends reports at their configured hour
    cron.schedule('0 * * * *', async () => {
        console.log('🔄 Running hourly report check...');
        await processReports('daily');
        await processReports('weekly');
        await processReports('monthly');
    });

    // Run payment reminders at 9:00 AM every day
    cron.schedule('0 9 * * *', async () => {
        await processPaymentReminders();
    });

    // Run overdue alerts at 10:00 AM every day
    cron.schedule('0 10 * * *', async () => {
        await processOverdueAlerts();
    });

    console.log('✅ Report schedulers initialized');
    console.log('   - Hourly report check: 0 * * * *');
    console.log('   - Payment reminders: 0 9 * * *');
    console.log('   - Overdue alerts: 0 10 * * *');
}

module.exports = {
    initializeSchedulers,
    processReports,
    processPaymentReminders,
    processOverdueAlerts,
    sendDailyReportForTenant,
    sendWeeklyReportForTenant,
    sendMonthlyReportForTenant
};
