/**
 * Azul Payment Gateway Integration
 * https://azul.com.do/Documentos/Desarrolladores
 */

const crypto = require('crypto');

// Azul Configuration
const AZUL_CONFIG = {
    test: {
        pageUrl: 'https://pruebas.azul.com.do/paymentpage/',
        merchantId: process.env.AZUL_MERCHANT_ID || '',
        merchantName: process.env.AZUL_MERCHANT_NAME || 'Presta Pro',
        auth1: process.env.AZUL_AUTH1 || '',
        auth2: process.env.AZUL_AUTH2 || '',
    },
    production: {
        pageUrl: 'https://pagos.azul.com.do/paymentpage/',
        merchantId: process.env.AZUL_MERCHANT_ID || '',
        merchantName: process.env.AZUL_MERCHANT_NAME || 'Presta Pro',
        auth1: process.env.AZUL_AUTH1 || '',
        auth2: process.env.AZUL_AUTH2 || '',
    }
};

const getConfig = () => {
    const env = process.env.AZUL_ENV === 'production' ? 'production' : 'test';
    return AZUL_CONFIG[env];
};

/**
 * Generate payment form data for Azul Payment Page
 */
function generatePaymentData(options) {
    const config = getConfig();
    const {
        orderId,
        amount, // Amount in cents (e.g., 50000 for RD$500.00)
        currency = '214', // 214 = DOP (Dominican Peso)
        customerName,
        customerEmail,
        description,
        callbackUrl,
        cancelUrl,
    } = options;

    // Format amount (12 digits, no decimals, padded with zeros)
    const formattedAmount = String(amount).padStart(12, '0');

    const paymentData = {
        MerchantId: config.merchantId,
        MerchantName: config.merchantName,
        MerchantType: 'E-Commerce',
        CurrencyCode: currency,
        OrderNumber: orderId,
        Amount: formattedAmount,
        ITBIS: '000000000000', // Tax (0 for subscriptions)
        ApprovedUrl: callbackUrl,
        DeclinedUrl: callbackUrl,
        CancelUrl: cancelUrl || callbackUrl,
        UseCustomField1: '1',
        CustomField1Label: 'Email',
        CustomField1Value: customerEmail,
        UseCustomField2: '1',
        CustomField2Label: 'Descripcion',
        CustomField2Value: description,
        ShowTransactionResult: '1',
        Language: 'ES',
    };

    // Generate AuthHash (SHA512)
    const authString = `${config.merchantId}${config.merchantName}${paymentData.MerchantType}${paymentData.CurrencyCode}${paymentData.OrderNumber}${paymentData.Amount}${paymentData.ITBIS}${paymentData.ApprovedUrl}${paymentData.DeclinedUrl}${paymentData.CancelUrl}${config.auth1}${config.auth2}`;
    paymentData.AuthHash = crypto.createHash('sha512').update(authString).digest('hex');

    return {
        pageUrl: config.pageUrl,
        formData: paymentData,
    };
}

/**
 * Verify Azul response hash
 */
function verifyResponseHash(responseData) {
    const config = getConfig();

    // Rebuild hash from response
    const hashString = `${responseData.OrderNumber}${responseData.Amount}${responseData.AuthorizationCode}${responseData.DateTime}${responseData.ResponseCode}${responseData.IsoCode}${responseData.ResponseMessage}${responseData.ErrorDescription}${responseData.RRN}${config.auth1}${config.auth2}`;

    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    return calculatedHash.toLowerCase() === (responseData.AuthHash || '').toLowerCase();
}

/**
 * Parse Azul response
 */
function parseResponse(responseData) {
    const isApproved = responseData.ResponseCode === '00' || responseData.IsoCode === '00';

    return {
        success: isApproved,
        orderId: responseData.OrderNumber,
        amount: parseInt(responseData.Amount || '0', 10) / 100, // Convert cents to currency
        authorizationCode: responseData.AuthorizationCode,
        referenceNumber: responseData.RRN,
        responseCode: responseData.ResponseCode,
        isoCode: responseData.IsoCode,
        message: responseData.ResponseMessage || responseData.ErrorDescription,
        dateTime: responseData.DateTime,
        cardBrand: responseData.CardNumber ? 'VISA/MC' : null,
        rawData: responseData,
    };
}

/**
 * Subscription plan pricing (in DOP cents)
 */
const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Plan Gratis',
        monthlyPrice: 0,
        yearlyPrice: 0,
        limits: {
            maxClients: 10,
            maxLoans: 5,
            maxUsers: 1,
            aiQueries: 0,
        },
        features: ['10 clientes', '5 préstamos activos', '1 usuario'],
    },
    PRO: {
        id: 'PRO',
        name: 'Plan Profesional',
        monthlyPrice: 99900, // RD$999.00
        yearlyPrice: 999900, // RD$9,999.00 (2 meses gratis)
        limits: {
            maxClients: 100,
            maxLoans: 50,
            maxUsers: 5,
            aiQueries: 100,
        },
        features: ['100 clientes', '50 préstamos activos', '5 usuarios', '100 consultas AI/mes'],
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        monthlyPrice: 249900, // RD$2,499.00
        yearlyPrice: 2499900, // RD$24,999.00 (2 meses gratis)
        limits: {
            maxClients: -1, // Unlimited
            maxLoans: -1,
            maxUsers: -1,
            aiQueries: -1,
        },
        features: ['Clientes ilimitados', 'Préstamos ilimitados', 'Usuarios ilimitados', 'AI ilimitado', 'Soporte prioritario'],
    },
};

function getPlanPrice(planId, interval = 'monthly') {
    const plan = PLANS[planId];
    if (!plan) return 0;
    return interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
}

function formatPriceForDisplay(cents) {
    return `RD$${(cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

module.exports = {
    generatePaymentData,
    verifyResponseHash,
    parseResponse,
    getConfig,
    PLANS,
    getPlanPrice,
    formatPriceForDisplay,
};
