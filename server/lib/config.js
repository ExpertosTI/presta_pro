/**
 * Configuration for PrestaPro server
 * Centralizes environment variables and fallback values to avoid duplication and security risks.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';

if (IS_PRODUCTION && JWT_SECRET === 'prestapro_dev_jwt_secret_change_me') {
  console.warn('⚠️ WARNING: Using default JWT_SECRET in production is not recommended');
}

// Port and Base URL
const PORT = process.env.PORT || 4000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// SMTP Config
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(
  process.env.SMTP_PORT && process.env.SMTP_PORT !== '25'
    ? process.env.SMTP_PORT
    : '465',
  10
);
const SMTP_USER = process.env.SMTP_USER || 'info@renace.tech';
const SMTP_PASS = process.env.SMTP_PASS || 'JustWork2027@';
const SMTP_FROM = process.env.SMTP_FROM && process.env.SMTP_FROM !== 'noreply@renace.tech'
  ? process.env.SMTP_FROM
  : `"PRESTA PRO" <${SMTP_USER}>`;

// Admin Notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || 'adderlymarte@hotmail.com';

// Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

module.exports = {
  IS_PRODUCTION,
  JWT_SECRET,
  PORT,
  APP_BASE_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  ADMIN_EMAIL,
  GOOGLE_CLIENT_ID
};
