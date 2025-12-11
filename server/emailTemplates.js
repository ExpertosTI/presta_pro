// Email Templates for Presta Pro
// Branding: PRESTAPRO by RENACE.TECH
// Modern, Dynamic Email Templates with Premium Design

const BRAND_NAME = 'PRESTAPRO';
const BRAND_TAGLINE = 'by RENACE.TECH';
const BRAND_COLOR = '#2563eb'; // Primary Blue
const BRAND_COLOR_DARK = '#1d4ed8'; // Darker Blue for hover
const ACCENT_COLOR = '#10b981'; // Emerald Green for success
// Solid dark blue colors - gradients can fail in email clients
const HEADER_BG = '#1e3a8a'; // Dark blue solid
const HEADER_TEXT = '#ffffff';

// Logo URL - usando data URI para garantizar que se muestre
const LOGO_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiMyNTYzZWIiLz48cGF0aCBkPSJNMjAgMjBoMjR2NEgyNHYtNHptMCA4aDIwdjRIMjB2LTR6bTAgOGgxNnY0SDIwdi00em0wIDhoMTJ2NEgyMHYtNHoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';

/**
 * Base HTML template with premium branding
 */
const getEmailTemplate = (content, tenantName = 'PRESTAPRO', showTenantInHeader = true) => `
<!DOCTYPE html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${tenantName} - ${BRAND_NAME}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table {border-collapse: collapse;}
    .button-td, .button-a {transition: none !important;}
  </style>
  <![endif]-->
  <style>
    /* Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0f172a !important; }
      .content-bg { background-color: #1e293b !important; }
    }
    
    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      .padding-mobile { padding: 20px !important; }
    }
    
    /* Button hover effect */
    .button-a:hover { background-color: ${BRAND_COLOR_DARK} !important; transform: translateY(-2px); }
  </style>
</head>
<body style="margin: 0; padding: 0; word-spacing: normal; background-color: #f1f5f9;">
  <div role="article" aria-roledescription="email" lang="es" style="text-size-adjust: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    
    <!-- Preheader Text -->
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
      ${BRAND_NAME} - Tu plataforma de gestión financiera profesional
    </div>
    
    <!-- Email Body -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 40px 20px;" class="email-bg">
      <tr>
        <td align="center" valign="top">
          
          <!-- Main Container -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto;" class="email-container">
            
            <!-- Header with Solid Blue -->
            <tr>
              <td style="background-color: ${HEADER_BG}; padding: 48px 40px; text-align: center; border-radius: 16px 16px 0 0;">
                
                <!-- Logo Container -->
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 12px;">
                  <img src="${LOGO_DATA_URI}" alt="${BRAND_NAME}" width="56" height="56" style="display: block; margin: 0 auto; border-radius: 12px;" />
                </div>
                
                <!-- Brand Name -->
                <h1 style="color: ${HEADER_TEXT}; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -0.03em;">
                  ${BRAND_NAME}
                </h1>
                
                <!-- Tagline -->
                <p style="color: #bfdbfe; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 0; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;">
                  ${BRAND_TAGLINE}
                </p>
                
                ${showTenantInHeader ? `
                <!-- Tenant Badge -->
                <div style="margin-top: 24px; display: inline-block; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 50px; padding: 10px 24px;">
                  <span style="color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600;">
                    🏦 ${tenantName}
                  </span>
                </div>
                ` : ''}
              </td>
            </tr>

            <!-- Content Area with Shadow -->
            <tr>
              <td style="background-color: #ffffff; padding: 48px 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" class="content-bg padding-mobile">
                ${content}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 32px 40px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
                
                <!-- Social Icons Placeholder -->
                <div style="margin-bottom: 20px;">
                  <span style="display: inline-block; width: 36px; height: 36px; background-color: ${BRAND_COLOR}; border-radius: 50%; margin: 0 6px; line-height: 36px; color: white; font-size: 14px;">💼</span>
                  <span style="display: inline-block; width: 36px; height: 36px; background-color: #0ea5e9; border-radius: 50%; margin: 0 6px; line-height: 36px; color: white; font-size: 14px;">📧</span>
                  <span style="display: inline-block; width: 36px; height: 36px; background-color: #8b5cf6; border-radius: 50%; margin: 0 6px; line-height: 36px; color: white; font-size: 14px;">🌐</span>
                </div>
                
                <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 0 0 8px; font-weight: 600;">
                  ${tenantName} • Gestión de Préstamos Profesional
                </p>
                <p style="color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin: 0 0 16px;">
                  &copy; ${new Date().getFullYear()} ${BRAND_NAME} ${BRAND_TAGLINE}. Todos los derechos reservados.
                </p>
                
                <!-- Legal Footer -->
                <div style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; margin: 0; line-height: 1.6;">
                    Este es un correo automático generado por ${BRAND_NAME}.<br/>
                    Por favor no responder a este correo.
                  </p>
                </div>
              </td>
            </tr>

          </table>
          
        </td>
      </tr>
    </table>
    
  </div>
</body>
</html>
`;

/**
 * Registration/Verification Email Template - PREMIUM VERSION
 */
const getVerificationEmail = (tenantName, verifyUrl) => {
  const content = `
    <!-- Welcome Icon -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 50%; line-height: 72px; font-size: 36px;">
        🎉
      </div>
    </div>
    
    <!-- Main Heading -->
    <h2 style="color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0 0 16px; font-size: 28px; font-weight: 800; text-align: center; letter-spacing: -0.02em;">
      ¡Bienvenido/a a ${BRAND_NAME}!
    </h2>
    
    <!-- Subtitle -->
    <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      Tu cuenta para <strong style="color: ${BRAND_COLOR};">${tenantName}</strong> está lista.<br/>
      Solo falta un paso para comenzar.
    </p>
    
    <!-- Feature Highlights -->
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
      <p style="color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 0 0 16px; font-weight: 600;">
        Con ${BRAND_NAME} podrás:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #dbeafe; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 12px; font-size: 14px;">✓</span>
            <span style="color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Gestionar préstamos de forma profesional</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #d1fae5; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 12px; font-size: 14px;">✓</span>
            <span style="color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Controlar cobros y pagos en tiempo real</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 12px; font-size: 14px;">✓</span>
            <span style="color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Generar reportes y recibos al instante</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Button - Premium Design -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius: 12px; background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2);">
                <a href="${verifyUrl}" 
                   class="button-a"
                   style="display: inline-block;
                          padding: 18px 48px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          font-size: 16px;
                          font-weight: 700;
                          color: #ffffff;
                          text-decoration: none;
                          border-radius: 12px;
                          letter-spacing: 0.02em;">
                  ✨ Activar mi Cuenta
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Security Badge -->
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50px; padding: 8px 16px;">
        <span style="color: #15803d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600;">
          🔒 Enlace seguro y encriptado
        </span>
      </span>
    </div>

    <!-- Alternative Link -->
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px dashed #cbd5e1;">
      <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; margin: 0 0 8px; text-align: center;">
        ¿El botón no funciona? Copia y pega este enlace:
      </p>
      <p style="color: ${BRAND_COLOR}; font-family: 'Courier New', monospace; font-size: 12px; margin: 0; word-break: break-all; text-align: center; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        ${verifyUrl}
      </p>
    </div>

    <!-- Expiration Warning -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-top: 24px;">
      <p style="color: #92400e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 0; line-height: 1.6;">
        ⏱️ <strong>Importante:</strong> Este enlace expirará en <strong>3 horas</strong> por seguridad.
      </p>
    </div>

    <!-- Footer Note -->
    <p style="color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; margin: 28px 0 0; line-height: 1.6; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
    </p>
  `;

  return getEmailTemplate(content, tenantName, true);
};

/**
 * Resend Verification Email Template - PREMIUM VERSION
 */
const getResendVerificationEmail = (tenantName, verifyUrl) => {
  const content = `
    <!-- Resend Icon -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border-radius: 50%; line-height: 72px; font-size: 36px;">
        🔄
      </div>
    </div>
    
    <!-- Main Heading -->
    <h2 style="color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0 0 16px; font-size: 26px; font-weight: 800; text-align: center; letter-spacing: -0.02em;">
      Reenvío de Enlace de Activación
    </h2>
    
    <!-- Message -->
    <p style="color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; margin: 0 0 32px; font-size: 16px; text-align: center;">
      Hemos recibido tu solicitud para reenviar el enlace de activación de tu cuenta 
      <strong style="color: ${BRAND_COLOR};">${tenantName}</strong>.
    </p>

    <!-- CTA Button - Premium Design -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius: 12px; background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%); box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2);">
                <a href="${verifyUrl}" 
                   class="button-a"
                   style="display: inline-block;
                          padding: 18px 48px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          font-size: 16px;
                          font-weight: 700;
                          color: #ffffff;
                          text-decoration: none;
                          border-radius: 12px;
                          letter-spacing: 0.02em;">
                  ✅ Activar Cuenta Ahora
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Security Badge -->
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50px; padding: 8px 16px;">
        <span style="color: #15803d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600;">
          🔒 Enlace seguro y encriptado
        </span>
      </span>
    </div>

    <!-- Alternative Link -->
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px dashed #cbd5e1;">
      <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; margin: 0 0 8px; text-align: center;">
        ¿El botón no funciona? Copia y pega este enlace:
      </p>
      <p style="color: ${BRAND_COLOR}; font-family: 'Courier New', monospace; font-size: 12px; margin: 0; word-break: break-all; text-align: center; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        ${verifyUrl}
      </p>
    </div>

    <!-- Footer Note -->
    <p style="color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; margin: 28px 0 0; line-height: 1.6; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      Si ya activaste tu cuenta, puedes ignorar este mensaje.
    </p>
  `;

  return getEmailTemplate(content, tenantName, true);
};

/**
 * Admin Notification Email Template - PREMIUM VERSION
 */
const getAdminNotificationEmail = (tenantName, tenantSlug, adminEmail, verifyUrl) => {
  const content = `
    <!-- Admin Icon -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 50%; line-height: 72px; font-size: 36px;">
        📋
      </div>
    </div>
    
    <!-- Main Heading -->
    <h2 style="color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0 0 16px; font-size: 24px; font-weight: 800; text-align: center; letter-spacing: -0.02em;">
      Nuevo Registro en ${BRAND_NAME}
    </h2>
    
    <!-- Subtitle -->
    <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      Se ha registrado una nueva cuenta en la plataforma.
    </p>

    <!-- Registration Details Card -->
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="display: inline-block; width: 32px; height: 32px; background-color: #dbeafe; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🏢</span>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                  <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Nombre de la Empresa</p>
                  <p style="color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; margin: 4px 0 0;">${tenantName}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="display: inline-block; width: 32px; height: 32px; background-color: #d1fae5; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🔗</span>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                  <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Slug / Identificador</p>
                  <p style="color: #0f172a; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600; margin: 4px 0 0; background-color: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tenantSlug}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="display: inline-block; width: 32px; height: 32px; background-color: #fef3c7; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">👤</span>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                  <p style="color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Email del Administrador</p>
                  <p style="color: ${BRAND_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; margin: 4px 0 0;">${adminEmail}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Verification Link Section -->
    <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bfdbfe;">
      <p style="color: #1e40af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 0 0 12px; font-weight: 600;">
        🔗 Enlace de Verificación:
      </p>
      <a href="${verifyUrl}" style="color: ${BRAND_COLOR}; font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all; text-decoration: none; display: block; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        ${verifyUrl}
      </a>
    </div>

    <!-- Timestamp -->
    <p style="color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin: 24px 0 0; text-align: center;">
      📅 Registrado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </p>
  `;

  return getEmailTemplate(content, 'Panel de Administración', false);
};

module.exports = {
  getVerificationEmail,
  getResendVerificationEmail,
  getAdminNotificationEmail,
  BRAND_NAME,
  BRAND_TAGLINE,
};
