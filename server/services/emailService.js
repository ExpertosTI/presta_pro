/**
 * Email Service - Centralized email sending with templates
 * RenKredit by Renace.tech
 */

const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || '85.31.224.232';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const SMTP_USER = process.env.SMTP_USER || 'noreply@renkredit.renace.tech';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || '"RENKREDIT" <noreply@renkredit.renace.tech>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@renace.tech';

// Brand constants
const BRAND_NAME = 'RENKREDIT';
const BRAND_TAGLINE = 'by RENACE.TECH';
const BRAND_COLOR = '#2563eb';
const HEADER_BG = '#3b82f6'; // Lighter blue for better contrast

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  tls: { rejectUnauthorized: false }
});

/**
 * Base email template wrapper
 */
const wrapEmailTemplate = (content, tenantName = BRAND_NAME) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tenantName} - ${BRAND_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${HEADER_BG}; padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 800;">${BRAND_NAME}</h1>
              <p style="color: #bfdbfe; margin: 0; font-size: 14px; letter-spacing: 0.1em;">${BRAND_TAGLINE}</p>
              ${tenantName !== BRAND_NAME ? `<p style="color: #93c5fd; margin-top: 16px; font-size: 14px;">🏦 ${tenantName}</p>` : ''}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 0 0 16px 16px;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${BRAND_NAME} ${BRAND_TAGLINE}
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 8px;">
                Este es un correo automático. Por favor no responder.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send email with error handling
 */
const sendEmail = async ({ to, subject, html, text }) => {
  console.log(`[EMAIL] Attempting to send to: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] SMTP: ${SMTP_HOST}:${SMTP_PORT}, User: ${SMTP_USER}`);

  try {
    const result = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `[${BRAND_NAME}] ${subject}`,
      html,
      text: text || subject
    });
    console.log(`[EMAIL] ✅ SUCCESS - Sent to ${to}`);
    console.log(`[EMAIL] MessageId: ${result.messageId}`);
    console.log(`[EMAIL] Response: ${result.response}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[EMAIL] ❌ FAILED to ${to}:`, error.message);
    console.error(`[EMAIL] Error code: ${error.code}`);
    console.error(`[EMAIL] Full error:`, error);
    return { success: false, error: error.message };
  }
};

// ============================================
// PAYMENT EMAILS
// ============================================

/**
 * Payment confirmation email
 */
const sendPaymentConfirmation = async ({ to, tenantName, clientName, amount, installmentNumber, date, receiptId }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; line-height: 64px; font-size: 32px;">✅</div>
    </div>
    
    <h2 style="color: #0f172a; text-align: center; margin: 0 0 24px;">Pago Registrado</h2>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${clientName}</p>
      <p style="margin: 0 0 8px;"><strong>Cuota:</strong> #${installmentNumber}</p>
      <p style="margin: 0 0 8px;"><strong>Monto:</strong> RD$${parseFloat(amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
      <p style="margin: 0;"><strong>Fecha:</strong> ${new Date(date).toLocaleDateString('es-DO')}</p>
    </div>
    
    <p style="color: #64748b; font-size: 14px; text-align: center;">Recibo: ${receiptId?.slice(0, 8).toUpperCase() || 'N/A'}</p>
  `;

  return sendEmail({
    to,
    subject: `Pago Registrado - ${clientName}`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

/**
 * Payment reminder email (before due date)
 */
const sendPaymentReminder = async ({ to, tenantName, clientName, amount, dueDate, daysUntilDue }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; line-height: 64px; font-size: 32px;">⏰</div>
    </div>
    
    <h2 style="color: #0f172a; text-align: center; margin: 0 0 8px;">Recordatorio de Pago</h2>
    <p style="color: #64748b; text-align: center; margin: 0 0 24px;">Próximo vencimiento en ${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'}</p>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
      <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${clientName}</p>
      <p style="margin: 0 0 8px;"><strong>Monto:</strong> RD$${parseFloat(amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
      <p style="margin: 0;"><strong>Vencimiento:</strong> ${new Date(dueDate).toLocaleDateString('es-DO')}</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Recordatorio: Pago próximo a vencer - ${clientName}`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

/**
 * Overdue notice email
 */
const sendOverdueNotice = async ({ to, tenantName, clientName, amount, dueDate, daysOverdue, penaltyAmount }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; line-height: 64px; font-size: 32px;">⚠️</div>
    </div>
    
    <h2 style="color: #dc2626; text-align: center; margin: 0 0 8px;">Cuota Vencida</h2>
    <p style="color: #64748b; text-align: center; margin: 0 0 24px;">${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'} de mora</p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 12px; border-left: 4px solid #dc2626; margin-bottom: 24px;">
      <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${clientName}</p>
      <p style="margin: 0 0 8px;"><strong>Monto Cuota:</strong> RD$${parseFloat(amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
      ${penaltyAmount > 0 ? `<p style="margin: 0 0 8px; color: #dc2626;"><strong>Mora:</strong> RD$${parseFloat(penaltyAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>` : ''}
      <p style="margin: 0;"><strong>Venció:</strong> ${new Date(dueDate).toLocaleDateString('es-DO')}</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `⚠️ Cuota Vencida - ${clientName}`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

// ============================================
// REPORT EMAILS
// ============================================

/**
 * Daily report email
 */
const sendDailyReport = async ({ to, tenantName, date, stats }) => {
  const { totalCollected, totalExpenses, receiptsCount, overdueCount, balance } = stats;

  const content = `
    <h2 style="color: #0f172a; text-align: center; margin: 0 0 8px;">📊 Reporte Diario</h2>
    <p style="color: #64748b; text-align: center; margin: 0 0 24px;">${new Date(date).toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    
    <table role="presentation" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background: #d1fae5; border-radius: 12px; text-align: center;">
          <p style="margin: 0; color: #166534; font-size: 12px; font-weight: 600;">COBRADO</p>
          <p style="margin: 8px 0 0; color: #166534; font-size: 24px; font-weight: 700;">RD$${parseFloat(totalCollected).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
          <p style="margin: 4px 0 0; color: #166534; font-size: 12px;">${receiptsCount} recibos</p>
        </td>
      </tr>
      <tr><td style="padding: 8px;"></td></tr>
      <tr>
        <td style="padding: 16px; background: #fee2e2; border-radius: 12px; text-align: center;">
          <p style="margin: 0; color: #dc2626; font-size: 12px; font-weight: 600;">GASTOS</p>
          <p style="margin: 8px 0 0; color: #dc2626; font-size: 24px; font-weight: 700;">RD$${parseFloat(totalExpenses).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
        </td>
      </tr>
      <tr><td style="padding: 8px;"></td></tr>
      <tr>
        <td style="padding: 16px; background: ${balance >= 0 ? '#dbeafe' : '#fef3c7'}; border-radius: 12px; text-align: center;">
          <p style="margin: 0; color: ${balance >= 0 ? '#1d4ed8' : '#b45309'}; font-size: 12px; font-weight: 600;">BALANCE</p>
          <p style="margin: 8px 0 0; color: ${balance >= 0 ? '#1d4ed8' : '#b45309'}; font-size: 24px; font-weight: 700;">RD$${parseFloat(balance).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
        </td>
      </tr>
    </table>
    
    ${overdueCount > 0 ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; text-align: center;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>${overdueCount}</strong> cuotas vencidas pendientes</p>
      </div>
    ` : ''}
  `;

  return sendEmail({
    to,
    subject: `Reporte Diario - ${new Date(date).toLocaleDateString('es-DO')}`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

// ============================================
// SUBSCRIPTION EMAILS
// ============================================

/**
 * Subscription expiring soon email
 */
const sendSubscriptionExpiringEmail = async ({ to, tenantName, plan, expiresAt, daysRemaining }) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; line-height: 64px; font-size: 32px;">💳</div>
    </div>
    
    <h2 style="color: #0f172a; text-align: center; margin: 0 0 8px;">Tu suscripción está por vencer</h2>
    <p style="color: #64748b; text-align: center; margin: 0 0 24px;">Quedan <strong>${daysRemaining}</strong> días</p>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px;"><strong>Plan actual:</strong> ${plan}</p>
      <p style="margin: 0;"><strong>Vence:</strong> ${new Date(expiresAt).toLocaleDateString('es-DO')}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${process.env.APP_URL || 'https://prestapro.renace.tech'}/#/pricing" 
         style="display: inline-block; padding: 16px 32px; background: ${BRAND_COLOR}; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
        Renovar Ahora
      </a>
    </div>
  `;

  return sendEmail({
    to,
    subject: `⏰ Tu suscripción vence en ${daysRemaining} días`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

// ============================================
// COLLECTOR EMAILS
// ============================================

/**
 * Welcome collector email with credentials
 */
const sendCollectorWelcomeEmail = async ({ to, tenantName, tenantSlug, collectorName, username, temporaryPassword }) => {
  const appUrl = process.env.APP_URL || 'https://prestanace.renace.tech';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background: #dbeafe; border-radius: 50%; line-height: 64px; font-size: 32px;">👋</div>
    </div>
    
    <h2 style="color: #0f172a; text-align: center; margin: 0 0 8px;">¡Bienvenido/a al equipo!</h2>
    <p style="color: #64748b; text-align: center; margin: 0 0 24px;">Hola ${collectorName}, tu cuenta de cobrador está lista</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
      <p style="margin: 0 0 12px;"><strong>🏢 Código de Empresa:</strong></p>
      <div style="background: #dbeafe; padding: 10px; border-radius: 8px; text-align: center; font-family: monospace; font-size: 16px; color: #1e40af; margin-bottom: 12px;">
        ${tenantSlug || tenantName.toLowerCase().replace(/\s+/g, '-')}
      </div>
      <p style="margin: 0 0 8px;"><strong>👤 Usuario:</strong> ${username}</p>
      <p style="margin: 0 0 8px;"><strong>🔐 Contraseña temporal:</strong></p>
      <div style="background: #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 2px;">
        ${temporaryPassword}
      </div>
    </div>
    
    <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Por seguridad, cambia tu contraseña en el primer inicio de sesión.</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${appUrl}/collector-login" 
         style="display: inline-block; padding: 16px 32px; background: ${BRAND_COLOR}; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
        Iniciar Sesión
      </a>
    </div>
    
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
      URL de acceso: ${appUrl}/collector-login
    </p>
  `;

  return sendEmail({
    to,
    subject: `Bienvenido al equipo de ${tenantName}`,
    html: wrapEmailTemplate(content, tenantName)
  });
};

// ============================================
// NOTIFICATION SERVICE
// ============================================

/**
 * Create in-app notification
 */
const createNotification = async ({ tenantId, userId, type, title, message, actionUrl, data }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        tenantId,
        userId,
        type,
        title,
        message,
        actionUrl,
        data
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Get unread notifications for tenant/user
 */
const getUnreadNotifications = async (tenantId, userId = null) => {
  const where = {
    tenantId,
    read: false
  };

  if (userId) {
    where.OR = [
      { userId: null }, // Notifications for all users
      { userId }
    ];
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (tenantId, userId = null) => {
  const where = { tenantId };
  if (userId) {
    where.OR = [
      { userId: null },
      { userId }
    ];
  }

  return prisma.notification.updateMany({
    where,
    data: { read: true }
  });
};

module.exports = {
  // Email sending
  sendEmail,
  sendPaymentConfirmation,
  sendPaymentReminder,
  sendOverdueNotice,
  sendDailyReport,
  sendSubscriptionExpiringEmail,
  sendCollectorWelcomeEmail,

  // Notifications
  createNotification,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,

  // Constants
  BRAND_NAME,
  BRAND_TAGLINE,
  ADMIN_EMAIL,

  // Template helper
  wrapEmailTemplate
};
