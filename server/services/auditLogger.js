/**
 * Audit Logger Service
 * Registers all important actions for accounting compliance
 */

const prisma = require('../lib/prisma');

/**
 * Log an auditable action
 * @param {Object} params
 * @param {string} params.action - Action type (e.g., 'loan.created', 'payment.registered')
 * @param {string} params.resource - Resource type (e.g., 'loan', 'client', 'payment')
 * @param {string} [params.resourceId] - ID of the affected resource
 * @param {string} [params.userId] - User who performed the action
 * @param {string} [params.tenantId] - Tenant context
 * @param {Object} [params.details] - Additional details (stored as JSON)
 * @param {string} [params.ipAddress] - Request IP address
 * @param {string} [params.userAgent] - Request user agent
 */
async function logAudit({
    action,
    resource = 'system',
    resourceId = null,
    userId = null,
    tenantId = null,
    details = null,
    ipAddress = null,
    userAgent = null
}) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                resource,
                resourceId,
                userId,
                tenantId,
                details: details || undefined, // Prisma Json field accepts object directly
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        // Don't let audit failures break the main flow
        console.error('[AuditLog] Failed to log action:', action, error.message);
    }
}

/**
 * Express middleware to auto-log requests
 * Use on routes that need automatic auditing
 */
function auditMiddleware(actionPrefix) {
    return (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to capture response and log
        res.json = function (data) {
            // Only log successful mutations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const method = req.method;
                let action = actionPrefix;

                if (method === 'POST') action += '.created';
                else if (method === 'PUT' || method === 'PATCH') action += '.updated';
                else if (method === 'DELETE') action += '.deleted';
                else action += '.accessed';

                logAudit({
                    action,
                    resource: actionPrefix,
                    resourceId: req.params.id || data?.id || null,
                    userId: req.user?.userId || null,
                    tenantId: req.user?.tenantId || null,
                    details: {
                        method,
                        path: req.path,
                        statusCode: res.statusCode
                    },
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    userAgent: req.get('user-agent')
                });
            }

            return originalJson(data);
        };

        next();
    };
}

// Predefined action types for consistency
const AUDIT_ACTIONS = {
    // Authentication
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',

    // Clients
    CLIENT_CREATED: 'client.created',
    CLIENT_UPDATED: 'client.updated',
    CLIENT_DELETED: 'client.deleted',

    // Loans
    LOAN_CREATED: 'loan.created',
    LOAN_UPDATED: 'loan.updated',
    LOAN_CANCELLED: 'loan.cancelled',

    // Payments
    PAYMENT_REGISTERED: 'payment.registered',
    PAYMENT_REVERSED: 'payment.reversed',

    // Expenses
    EXPENSE_CREATED: 'expense.created',
    EXPENSE_DELETED: 'expense.deleted',

    // Subscription
    SUBSCRIPTION_CREATED: 'subscription.created',
    SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
    SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
    SUBSCRIPTION_PAYMENT: 'subscription.payment',

    // Settings
    SETTINGS_UPDATED: 'settings.updated'
};

module.exports = {
    logAudit,
    auditMiddleware,
    AUDIT_ACTIONS
};
