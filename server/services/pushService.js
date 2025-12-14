/**
 * Push Notification Service - Firebase Cloud Messaging
 * PrestaPro by Renace.tech
 * 
 * NOTE: Requires Firebase Admin SDK credentials.
 * Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable with the JSON content
 * or FIREBASE_SERVICE_ACCOUNT_PATH with path to the JSON file.
 */

const admin = require('firebase-admin');
const prisma = require('../lib/prisma');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
    if (firebaseInitialized) return true;

    try {
        let serviceAccount = null;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        }

        if (!serviceAccount) {
            console.warn('⚠️ Firebase credentials not configured. Push notifications disabled.');
            return false;
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        firebaseInitialized = true;
        console.log('✅ Firebase initialized for push notifications');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        return false;
    }
};

/**
 * Send push notification to a single device
 */
const sendPush = async ({ token, title, body, data = {}, icon = '/notification-icon.png' }) => {
    if (!initializeFirebase()) return { success: false, error: 'Firebase not configured' };

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: data.url || '/'
            },
            webpush: {
                notification: {
                    icon,
                    badge: '/icons/badge-72.png',
                    vibrate: [200, 100, 200]
                },
                fcmOptions: {
                    link: data.url || '/'
                }
            },
            token
        };

        const response = await admin.messaging().send(message);
        console.log('📱 Push sent:', response);
        return { success: true, messageId: response };
    } catch (error) {
        console.error('Push send error:', error.message);

        // Remove invalid tokens
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            await removeInvalidToken(token);
        }

        return { success: false, error: error.message };
    }
};

/**
 * Send push notification to multiple devices (batch)
 */
const sendPushToMultiple = async ({ tokens, title, body, data = {} }) => {
    if (!initializeFirebase()) return { success: false, error: 'Firebase not configured' };
    if (!tokens || tokens.length === 0) return { success: false, error: 'No tokens provided' };

    try {
        const message = {
            notification: { title, body },
            data,
            tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Handle failures
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.warn(`📱 Push: ${response.successCount} succeeded, ${response.failureCount} failed`);
        }

        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.error('Batch push error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send push to all users of a tenant
 */
const sendPushToTenant = async ({ tenantId, title, body, data = {} }) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                tenantId,
                pushToken: { not: null }
            },
            select: { pushToken: true }
        });

        const tokens = users.map(u => u.pushToken).filter(Boolean);

        if (tokens.length === 0) {
            return { success: false, error: 'No push tokens for tenant' };
        }

        return sendPushToMultiple({ tokens, title, body, data });
    } catch (error) {
        console.error('Tenant push error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Remove invalid token from database
 */
const removeInvalidToken = async (token) => {
    try {
        await prisma.user.updateMany({
            where: { pushToken: token },
            data: { pushToken: null }
        });
        console.log('🗑️ Invalid push token removed');
    } catch (error) {
        console.error('Error removing token:', error.message);
    }
};

/**
 * Save push token for a user
 */
const saveUserPushToken = async (userId, token) => {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token }
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving push token:', error.message);
        return { success: false, error: error.message };
    }
};

// ============================================
// NOTIFICATION TYPES
// ============================================

/**
 * Send payment received notification
 */
const notifyPaymentReceived = async ({ tenantId, clientName, amount }) => {
    return sendPushToTenant({
        tenantId,
        title: '💰 Pago Recibido',
        body: `${clientName} pagó RD$${amount.toLocaleString()}`,
        data: { type: 'payment', url: '/#/payments' }
    });
};

/**
 * Send overdue alert notification
 */
const notifyOverdueAlert = async ({ tenantId, count }) => {
    return sendPushToTenant({
        tenantId,
        title: '⚠️ Cuotas Vencidas',
        body: `Tienes ${count} cuota${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}`,
        data: { type: 'overdue', url: '/#/loans' }
    });
};

/**
 * Send subscription expiry warning
 */
const notifySubscriptionExpiring = async ({ tenantId, daysRemaining }) => {
    return sendPushToTenant({
        tenantId,
        title: '💳 Suscripción por Vencer',
        body: `Tu suscripción vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`,
        data: { type: 'subscription', url: '/#/subscription' }
    });
};

module.exports = {
    initializeFirebase,
    sendPush,
    sendPushToMultiple,
    sendPushToTenant,
    saveUserPushToken,
    // Notification helpers
    notifyPaymentReceived,
    notifyOverdueAlert,
    notifySubscriptionExpiring
};
