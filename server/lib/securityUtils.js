/**
 * Security Utilities for Presta Pro
 * Contains password validation, input sanitization, and security helpers
 */

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // Optional for user-friendliness
};

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePassword = (password) => {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Contraseña es requerida'] };
    }

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`La contraseña debe tener al menos ${PASSWORD_REQUIREMENTS.minLength} caracteres`);
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
        errors.push('La contraseña debe contener al menos un número');
    }

    if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('La contraseña debe contener al menos un carácter especial');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'prestapro'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
        errors.push('La contraseña es muy común. Elige una más segura');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean}
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
};

/**
 * Sanitizes a string to prevent XSS
 * @param {string} str - The string to sanitize
 * @returns {string}
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Generates a secure random token
 * @param {number} length - Length of the token in bytes (output will be hex, so 2x length)
 * @returns {string}
 */
const generateSecureToken = (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Masks sensitive data for logging
 * @param {string} data - The data to mask
 * @param {number} visibleChars - Number of visible characters at start and end
 * @returns {string}
 */
const maskSensitiveData = (data, visibleChars = 3) => {
    if (!data || typeof data !== 'string') return '***';
    if (data.length <= visibleChars * 2) return '***';
    return data.substring(0, visibleChars) + '***' + data.substring(data.length - visibleChars);
};

/**
 * Security headers for additional protection
 */
const additionalSecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

module.exports = {
    validatePassword,
    validateEmail,
    sanitizeString,
    generateSecureToken,
    maskSensitiveData,
    additionalSecurityHeaders,
    PASSWORD_REQUIREMENTS,
};
