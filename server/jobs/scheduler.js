/**
 * Scheduled Jobs - Cron jobs for automated tasks
 * PrestaPro by Renace.tech
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const emailService = require('../services/emailService');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Send daily reports to all tenants with dailyReport preference enabled
 * Runs at 6:00 AM every day
 */
const sendDailyReports = async () => {
    console.log('📊 Starting daily reports job...');

    try {
        // Get all tenants with daily report enabled
        const preferences = await prisma.emailPreference.findMany({
            where: { dailyReport: true },
            include: {
                tenant: {
                    include: {
                        users: { where: { role: 'admin' }, take: 1 }
                    }
                }
            }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        for (const pref of preferences) {
            if (!pref.tenant) continue;

            const tenantId = pref.tenant.id;
            const adminEmail = pref.reportEmail || pref.tenant.users[0]?.email;

            if (!adminEmail) continue;

            try {
                // Collect stats for today
                const [receipts, expenses, overdueInstallments] = await Promise.all([
                    prisma.receipt.findMany({
                        where: {
                            tenantId,
                            date: { gte: today, lt: tomorrow }
                        }
                    }),
                    prisma.expense.findMany({
                        where: {
                            tenantId,
                            date: { gte: today, lt: tomorrow }
                        }
                    }),
                    prisma.loanInstallment.findMany({
                        where: {
                            loan: { tenantId },
                            status: 'PENDING',
                            date: { lt: today }
                        }
                    })
                ]);

                const totalCollected = receipts.reduce((sum, r) => sum + (r.amount || 0) + (r.penaltyAmount || 0), 0);
                const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                await emailService.sendDailyReport({
                    to: adminEmail,
                    tenantName: pref.tenant.name,
                    date: today,
                    stats: {
                        totalCollected,
                        totalExpenses,
                        receiptsCount: receipts.length,
                        overdueCount: overdueInstallments.length,
                        balance: totalCollected - totalExpenses
                    }
                });

                console.log(`✅ Daily report sent to ${adminEmail} for ${pref.tenant.name}`);
            } catch (err) {
                console.error(`❌ Failed to send daily report for tenant ${tenantId}:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Daily reports job failed:', error);
    }
};

/**
 * Send payment reminders for installments due in X days
 * Runs at 8:00 AM every day
 */
const sendPaymentReminders = async () => {
    console.log('⏰ Starting payment reminders job...');

    try {
        const preferences = await prisma.emailPreference.findMany({
            where: { paymentReminders: true },
            include: { tenant: true }
        });

        for (const pref of preferences) {
            const tenantId = pref.tenant.id;
            const daysBeforeDue = pref.reminderDaysBefore || 3;

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysBeforeDue);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const dueInstallments = await prisma.loanInstallment.findMany({
                where: {
                    loan: { tenantId },
                    status: 'PENDING',
                    date: { gte: targetDate, lt: nextDay }
                },
                include: {
                    loan: {
                        include: { client: true }
                    }
                }
            });

            for (const inst of dueInstallments) {
                const client = inst.loan.client;
                if (!client?.email) continue;

                try {
                    await emailService.sendPaymentReminder({
                        to: client.email,
                        tenantName: pref.tenant.name,
                        clientName: client.name,
                        amount: inst.payment,
                        dueDate: inst.date,
                        daysUntilDue: daysBeforeDue
                    });
                    console.log(`📧 Reminder sent to ${client.email}`);
                } catch (err) {
                    console.error(`Failed to send reminder to ${client.email}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Payment reminders job failed:', error);
    }
};

/**
 * Send overdue notices for past-due installments
 * Runs at 9:00 AM every day
 */
const sendOverdueNotices = async () => {
    console.log('⚠️ Starting overdue notices job...');

    try {
        const preferences = await prisma.emailPreference.findMany({
            where: { overdueAlerts: true },
            include: { tenant: true }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const pref of preferences) {
            const tenantId = pref.tenant.id;

            const overdueInstallments = await prisma.loanInstallment.findMany({
                where: {
                    loan: { tenantId },
                    status: 'PENDING',
                    date: { lt: today }
                },
                include: {
                    loan: { include: { client: true } }
                }
            });

            for (const inst of overdueInstallments) {
                const client = inst.loan.client;
                if (!client?.email) continue;

                const daysOverdue = Math.floor((today - new Date(inst.date)) / (1000 * 60 * 60 * 24));
                // Skip if already notified recently (you'd need to track this)

                try {
                    await emailService.sendOverdueNotice({
                        to: client.email,
                        tenantName: pref.tenant.name,
                        clientName: client.name,
                        amount: inst.payment,
                        dueDate: inst.date,
                        daysOverdue,
                        penaltyAmount: inst.penalty || 0
                    });
                } catch (err) {
                    console.error(`Failed to send overdue notice to ${client.email}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Overdue notices job failed:', error);
    }
};

/**
 * Check expiring subscriptions
 * Runs at 10:00 AM every day
 */
const checkExpiringSubscriptions = async () => {
    console.log('💳 Checking expiring subscriptions...');

    try {
        const daysToCheck = [7, 3, 1]; // Alert at 7, 3, and 1 day before expiry

        for (const days of daysToCheck) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const expiringSubs = await prisma.subscription.findMany({
                where: {
                    status: 'ACTIVE',
                    currentPeriodEnd: { gte: targetDate, lt: nextDay }
                },
                include: {
                    tenant: {
                        include: { users: { where: { role: 'admin' }, take: 1 } }
                    }
                }
            });

            for (const sub of expiringSubs) {
                const adminEmail = sub.tenant.users[0]?.email;
                if (!adminEmail) continue;

                try {
                    await emailService.sendSubscriptionExpiringEmail({
                        to: adminEmail,
                        tenantName: sub.tenant.name,
                        plan: sub.plan,
                        expiresAt: sub.currentPeriodEnd,
                        daysRemaining: days
                    });
                    console.log(`💳 Expiry alert sent to ${adminEmail} (${days} days)`);
                } catch (err) {
                    console.error(`Failed to send expiry alert:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Subscription check failed:', error);
    }
};

/**
 * Initialize all scheduled jobs
 */
const initScheduler = () => {
    console.log('🕐 Initializing scheduled jobs...');

    // Daily reports at 6:00 AM
    cron.schedule('0 6 * * *', sendDailyReports, {
        timezone: 'America/Santo_Domingo'
    });

    // Payment reminders at 8:00 AM
    cron.schedule('0 8 * * *', sendPaymentReminders, {
        timezone: 'America/Santo_Domingo'
    });

    // Overdue notices at 9:00 AM
    cron.schedule('0 9 * * *', sendOverdueNotices, {
        timezone: 'America/Santo_Domingo'
    });

    // Subscription expiry check at 10:00 AM
    cron.schedule('0 10 * * *', checkExpiringSubscriptions, {
        timezone: 'America/Santo_Domingo'
    });

    console.log('✅ Scheduled jobs initialized');
    console.log('   📊 Daily reports: 6:00 AM');
    console.log('   ⏰ Payment reminders: 8:00 AM');
    console.log('   ⚠️ Overdue notices: 9:00 AM');
    console.log('   💳 Subscription check: 10:00 AM');
};

module.exports = {
    initScheduler,
    // Export individual functions for testing
    sendDailyReports,
    sendPaymentReminders,
    sendOverdueNotices,
    checkExpiringSubscriptions
};
