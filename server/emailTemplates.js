// Email Templates for Presta Pro
// Branding: PRESTAPRO by RENACE.TECH

const BRAND_NAME = 'PRESTAPRO';
const BRAND_TAGLINE = 'by RENACE.TECH';
const BRAND_COLOR = '#2563eb'; // Blue
const LOGO_URL = 'https://prestanace.renace.tech/logo-small.svg'; // Update with actual logo URL

/**
 * Base HTML template with branding
 */
const getEmailTemplate = (content, tenantName = 'PRESTAPRO') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tenantName} - ${BRAND_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo and Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="64" height="64" style="display: block; margin: 0 auto 16px; border-radius: 12px;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">${BRAND_NAME}</h1>
                    <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0; font-weight: 500; letter-spacing: 0.05em;">${BRAND_TAGLINE}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
                <strong>${tenantName}</strong> • Gestión de Préstamos
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME} ${BRAND_TAGLINE}. Todos los derechos reservados.
              </p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 12px 0 0;">
                Este es un correo automático, por favor no responder.
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
 * Registration/Verification Email Template
 */
const getVerificationEmail = (tenantName, verifyUrl) => {
    const content = `
    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 24px; font-weight: 700;">¡Bienvenido/a a ${BRAND_NAME}!</h2>
    
    <p style="color: #475569; line-height: 1.7; margin: 0 0 20px; font-size: 15px;">
      Hemos recibido la solicitud de registro para <strong>${tenantName}</strong>. 
      Para activar tu cuenta y comenzar a utilizar la plataforma, haz clic en el botón de abajo:
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" 
             style="background-color: ${BRAND_COLOR}; 
                    color: #ffffff; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    display: inline-block; 
                    font-size: 16px; 
                    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
                    transition: all 0.2s;">
            ✅ Activar mi Cuenta
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 14px; margin: 24px 0 12px; line-height: 1.6;">
      O copia y pega el siguiente enlace en tu navegador:
    </p>
    
    <div style="background-color: #f1f5f9; 
                padding: 14px; 
                border-radius: 6px; 
                word-break: break-all; 
                font-family: 'Courier New', monospace; 
                font-size: 13px; 
                color: #334155; 
                border: 1px solid #e2e8f0;
                margin-bottom: 24px;">
      ${verifyUrl}
    </div>

    <div style="background-color: #fef3c7; 
                border-left: 4px solid #f59e0b; 
                padding: 16px; 
                border-radius: 6px; 
                margin-top: 28px;">
      <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
        ⏱️ <strong>Importante:</strong> Este enlace de seguridad expirará en <strong>3 horas</strong>.
      </p>
    </div>

    <p style="color: #94a3b8; font-size: 13px; margin: 28px 0 0; line-height: 1.6; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
    </p>
  `;

    return getEmailTemplate(content, tenantName);
};

/**
 * Resend Verification Email Template
 */
const getResendVerificationEmail = (tenantName, verifyUrl) => {
    const content = `
    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Reenvío de Enlace de Activación</h2>
    
    <p style="color: #475569; line-height: 1.7; margin: 0 0 20px; font-size: 15px;">
      Hemos recibido una solicitud para reenviar el enlace de activación de tu cuenta <strong>${tenantName}</strong>.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" 
             style="background-color: ${BRAND_COLOR}; 
                    color: #ffffff; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    display: inline-block; 
                    font-size: 16px; 
                    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
            ✅ Activar Cuenta Ahora
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 14px; margin: 24px 0 12px; line-height: 1.6;">
      O copia y pega el siguiente enlace:
    </p>
    
    <div style="background-color: #f1f5f9; 
                padding: 14px; 
                border-radius: 6px; 
                word-break: break-all; 
                font-family: 'Courier New', monospace; 
                font-size: 13px; 
                color: #334155; 
                border: 1px solid #e2e8f0;">
      ${verifyUrl}
    </div>

    <p style="color: #94a3b8; font-size: 13px; margin: 28px 0 0; line-height: 1.6; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      Si ya activaste tu cuenta, puedes ignorar este mensaje.
    </p>
  `;

    return getEmailTemplate(content, tenantName);
};

/**
 * Admin Notification Email Template
 */
const getAdminNotificationEmail = (tenantName, tenantSlug, adminEmail, verifyUrl) => {
    const content = `
    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 700;">📋 Nuevo Registro en ${BRAND_NAME}</h2>
    
    <p style="color: #475569; line-height: 1.7; margin: 0 0 24px; font-size: 15px;">
      Se ha registrado una nueva cuenta en la plataforma:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 8px 0;">
                <strong style="color: #64748b; font-size: 13px;">Nombre:</strong>
                <p style="margin: 4px 0 0; color: #1e293b; font-size: 15px; font-weight: 600;">${tenantName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 13px;">Slug:</strong>
                <p style="margin: 4px 0 0; color: #1e293b; font-size: 15px; font-family: monospace;">${tenantSlug}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 13px;">Admin:</strong>
                <p style="margin: 4px 0 0; color: #1e293b; font-size: 15px;">${adminEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">
      Enlace de verificación:
    </p>
    
    <div style="background-color: #f1f5f9; 
                padding: 14px; 
                border-radius: 6px; 
                word-break: break-all; 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                color: #334155; 
                border: 1px solid #e2e8f0;">
      <a href="${verifyUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">${verifyUrl}</a>
    </div>
  `;

    return getEmailTemplate(content, 'Admin Panel');
};

module.exports = {
    getVerificationEmail,
    getResendVerificationEmail,
    getAdminNotificationEmail,
    BRAND_NAME,
    BRAND_TAGLINE,
};
