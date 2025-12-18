/**
 * PayPal Payment Service
 * RenKredit by Renace.tech
 * 
 * Integración con PayPal REST API para pagos de suscripciones
 */

const fetch = require('node-fetch');

// Configuración PayPal
const PAYPAL_CONFIG = {
    sandbox: {
        baseUrl: 'https://api-m.sandbox.paypal.com',
        clientId: process.env.PAYPAL_CLIENT_ID_SANDBOX || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET_SANDBOX || '',
    },
    production: {
        baseUrl: 'https://api-m.paypal.com',
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    }
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const getConfig = () => IS_PRODUCTION ? PAYPAL_CONFIG.production : PAYPAL_CONFIG.sandbox;

// Planes de suscripción (en USD)
const SUBSCRIPTION_PLANS = {
    PRO: {
        id: 'PRO',
        name: 'Plan Profesional',
        monthlyPrice: 15.00, // USD
        yearlyPrice: 150.00, // USD (2 meses gratis)
        description: '100 clientes, 50 préstamos, 5 usuarios, 100 consultas AI/mes',
        limits: {
            maxClients: 100,
            maxLoans: 50,
            maxUsers: 5,
            aiQueries: 100,
        }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        monthlyPrice: 27.00, // USD
        yearlyPrice: 270.00, // USD (2 meses gratis)
        description: 'Clientes, préstamos, usuarios y AI ilimitados',
        limits: {
            maxClients: -1,
            maxLoans: -1,
            maxUsers: -1,
            aiQueries: -1,
        }
    }
};

/**
 * Obtener access token de PayPal
 */
async function getAccessToken() {
    const config = getConfig();

    if (!config.clientId || !config.clientSecret) {
        throw new Error('PayPal credentials not configured');
    }

    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('PayPal auth error:', error);
        throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Crear orden de pago PayPal
 */
async function createOrder({ planId, interval = 'monthly', tenantId, returnUrl, cancelUrl }) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
        throw new Error(`Plan no válido: ${planId}`);
    }

    const amount = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const config = getConfig();
    const accessToken = await getAccessToken();

    const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
            reference_id: `${tenantId}_${planId}_${interval}_${Date.now()}`,
            description: `${plan.name} - ${interval === 'yearly' ? 'Anual' : 'Mensual'}`,
            custom_id: JSON.stringify({ tenantId, planId, interval }),
            amount: {
                currency_code: 'USD',
                value: amount.toFixed(2),
            },
        }],
        application_context: {
            brand_name: 'RenKredit',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
        },
    };

    const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('PayPal create order error:', error);
        throw new Error('Failed to create PayPal order');
    }

    const order = await response.json();

    // Encontrar el link de aprobación
    const approveLink = order.links.find(link => link.rel === 'approve');

    return {
        orderId: order.id,
        status: order.status,
        approveUrl: approveLink?.href,
        order,
    };
}

/**
 * Capturar pago de orden aprobada
 */
async function captureOrder(orderId) {
    const config = getConfig();
    const accessToken = await getAccessToken();

    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('PayPal capture error:', error);
        throw new Error('Failed to capture PayPal order');
    }

    const capture = await response.json();

    // Extraer información del pago
    const purchaseUnit = capture.purchase_units?.[0];
    const captureDetails = purchaseUnit?.payments?.captures?.[0];

    let customData = {};
    try {
        customData = JSON.parse(purchaseUnit?.custom_id || '{}');
    } catch (e) {
        console.warn('Could not parse custom_id:', e.message);
    }

    return {
        success: capture.status === 'COMPLETED',
        orderId: capture.id,
        status: capture.status,
        captureId: captureDetails?.id,
        amount: captureDetails?.amount?.value,
        currency: captureDetails?.amount?.currency_code,
        payerEmail: capture.payer?.email_address,
        payerName: `${capture.payer?.name?.given_name || ''} ${capture.payer?.name?.surname || ''}`.trim(),
        tenantId: customData.tenantId,
        planId: customData.planId,
        interval: customData.interval,
        rawData: capture,
    };
}

/**
 * Verificar estado de una orden
 */
async function getOrderDetails(orderId) {
    const config = getConfig();
    const accessToken = await getAccessToken();

    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('PayPal get order error:', error);
        throw new Error('Failed to get PayPal order details');
    }

    return await response.json();
}

/**
 * Calcular fecha de expiración de suscripción
 */
function calculateExpirationDate(interval) {
    const now = new Date();
    if (interval === 'yearly') {
        now.setFullYear(now.getFullYear() + 1);
    } else {
        now.setMonth(now.getMonth() + 1);
    }
    return now;
}

module.exports = {
    createOrder,
    captureOrder,
    getOrderDetails,
    getAccessToken,
    calculateExpirationDate,
    SUBSCRIPTION_PLANS,
    IS_PRODUCTION,
};
