const prisma = require('../lib/prisma');

/**
 * Middleware to check subscription status
 * Blocks access if subscription is expired or suspended
 * Allows access to subscription/payment routes even when blocked
 */
const subscriptionMiddleware = async (req, res, next) => {
    // Skip for routes that should always be accessible
    const allowedPaths = [
        '/api/subscriptions',
        '/api/auth',
        '/api/tenants/register',
    ];

    if (allowedPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    // Must have user from auth middleware
    if (!req.user || !req.user.tenantId) {
        return next(); // Let auth middleware handle this
    }

    try {
        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: req.user.tenantId }
        });

        // No subscription = treat as FREE trial
        if (!subscription) {
            // Create default FREE subscription
            const newSub = await prisma.subscription.create({
                data: {
                    tenantId: req.user.tenantId,
                    plan: 'FREE',
                    status: 'ACTIVE',
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    limits: JSON.stringify({
                        maxClients: 10,
                        maxLoans: 5,
                        maxUsers: 1,
                        aiQueries: 0
                    })
                }
            });
            req.subscription = newSub;
            return next();
        }

        // Check if subscription is blocked
        if (subscription.status === 'SUSPENDED' || subscription.status === 'CANCELLED') {
            return res.status(403).json({
                error: 'Cuenta suspendida',
                code: 'ACCOUNT_SUSPENDED',
                message: 'Tu suscripción está suspendida. Por favor realiza el pago para continuar.',
                redirectTo: '/pricing'
            });
        }

        // Check if subscription is expired
        if (subscription.status === 'EXPIRED' ||
            (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date())) {

            // Update status to expired if not already
            if (subscription.status !== 'EXPIRED') {
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'EXPIRED' }
                });
            }

            return res.status(403).json({
                error: 'Suscripción expirada',
                code: 'SUBSCRIPTION_EXPIRED',
                message: 'Tu suscripción ha expirado. Renueva para continuar usando la aplicación.',
                redirectTo: '/pricing'
            });
        }

        // Check plan limits
        const limits = typeof subscription.limits === 'string'
            ? JSON.parse(subscription.limits)
            : subscription.limits;

        req.subscription = subscription;
        req.subscriptionLimits = limits;
        next();

    } catch (error) {
        console.error('Subscription middleware error:', error);
        // Allow access on error to avoid blocking users due to DB issues
        next();
    }
};

/**
 * Check limit for a specific resource
 */
const checkLimit = (limitKey) => async (req, res, next) => {
    if (!req.subscription || !req.subscriptionLimits) {
        return next();
    }

    const limits = req.subscriptionLimits;
    const limit = limits[limitKey];

    if (limit === undefined || limit === -1) {
        // Unlimited
        return next();
    }

    try {
        let currentCount = 0;

        switch (limitKey) {
            case 'maxClients':
                currentCount = await prisma.client.count({
                    where: { tenantId: req.user.tenantId }
                });
                break;
            case 'maxLoans':
                currentCount = await prisma.loan.count({
                    where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
                });
                break;
            case 'maxUsers':
                currentCount = await prisma.user.count({
                    where: { tenantId: req.user.tenantId }
                });
                break;
            default:
                return next();
        }

        if (currentCount >= limit) {
            return res.status(403).json({
                error: 'Límite alcanzado',
                code: 'LIMIT_REACHED',
                limit: limitKey,
                current: currentCount,
                max: limit,
                message: `Has alcanzado el límite de tu plan (${limit}). Mejora tu plan para agregar más.`,
                redirectTo: '/pricing'
            });
        }

        next();
    } catch (error) {
        console.error('Limit check error:', error);
        next();
    }
};

module.exports = { subscriptionMiddleware, checkLimit };
