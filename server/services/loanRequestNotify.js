/**
 * WhatsApp alerts for loan requests (client + tenant admin).
 */

const prisma = require('../lib/prisma');
const whatsapp = require('./whatsappService');
const notify = require('./notificationHelper');

function money(amount) {
  return `RD$${Number(amount || 0).toLocaleString('es-DO')}`;
}

function freqLabel(frequency) {
  const map = {
    Diario: 'Diario',
    Semanal: 'Semanal',
    Quincenal: 'Quincenal',
    Mensual: 'Mensual',
  };
  return map[frequency] || frequency || '—';
}

async function tenantContext(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true },
  });
  const settings = tenant?.settings || {};
  const companyName = settings.companyName || tenant?.name || 'Presta Pro';
  const adminWhatsApp =
    settings.companyWhatsApp ||
    process.env.NOTIFY_WHATSAPP_TO ||
    process.env.ADMIN_WHATSAPP ||
    '';

  return { companyName, adminWhatsApp };
}

function buildClientReceivedMessage(request, companyName) {
  const c = request.client;
  return [
    `✨ ${companyName}`,
    '',
    `Hola ${c?.name || 'cliente'},`,
    '',
    'Recibimos tu solicitud de crédito. La estamos revisando y pronto te contactaremos.',
    '',
    `Monto: ${money(request.amount)}`,
    `Tasa: ${request.rate}%`,
    `Plazo: ${request.term} cuotas (${freqLabel(request.frequency)})`,
    '',
    'Gracias por confiar en nosotros.',
  ].join('\n');
}

function buildAdminNewRequestMessage(request, companyName) {
  const c = request.client;
  const lines = [
    `📬 Nueva solicitud · ${companyName}`,
    '',
    'Contacta al cliente para ultimar detalles.',
    '',
    `📞 Cliente: ${c?.phone || '—'}`,
    `Nombre: ${c?.name || '—'}`,
    '',
    `Monto: ${money(request.amount)}`,
    `Tasa: ${request.rate}%`,
    `Plazo: ${request.term} · ${freqLabel(request.frequency)}`,
  ];
  if (request.startDate) {
    lines.push(`Inicio: ${new Date(request.startDate).toLocaleDateString('es-DO')}`);
  }
  return lines.join('\n');
}

function buildClientApprovedMessage(request, companyName) {
  const c = request.client;
  return [
    `✅ ${companyName}`,
    '',
    `¡Hola ${c?.name || 'cliente'}!`,
    '',
    `Tu solicitud de crédito por ${money(request.amount)} fue APROBADA.`,
    'Pronto te contactaremos para los detalles del desembolso.',
    '',
    `Tasa: ${request.rate}% · ${request.term} cuotas (${freqLabel(request.frequency)})`,
  ].join('\n');
}

function buildClientRejectedMessage(request, companyName, reason) {
  const c = request.client;
  const lines = [
    `${companyName}`,
    '',
    `Hola ${c?.name || 'cliente'},`,
    '',
    `Tu solicitud de crédito por ${money(request.amount)} no fue aprobada en este momento.`,
  ];
  if (reason) lines.push('', `Motivo: ${reason}`);
  lines.push('', 'Si tienes preguntas, contáctanos.');
  return lines.join('\n');
}

async function sendLoanRequestWhatsApp(request, kind, extra = {}) {
  if (!whatsapp.whatsappConfigured()) {
    return { sent: false, skipped: true, reason: 'not_configured' };
  }

  const tenantId = request.tenantId;
  const { companyName, adminWhatsApp } = await tenantContext(tenantId);
  const clientPhone = request.client?.phone;
  let clientOk = false;
  let adminOk = false;
  let error;

  const notifyClient = whatsapp.clientNotifyEnabled() && clientPhone;

  try {
    if (kind === 'created') {
      if (notifyClient) {
        const r = await whatsapp.sendWhatsAppMessage(
          clientPhone,
          buildClientReceivedMessage(request, companyName),
        );
        clientOk = r.ok;
        if (!r.ok) error = r.error;
      }
      if (adminWhatsApp) {
        const r = await whatsapp.sendWhatsAppMessage(
          adminWhatsApp,
          buildAdminNewRequestMessage(request, companyName),
        );
        adminOk = r.ok;
        if (!r.ok && !error) error = r.error;
      } else {
        console.warn('[loan-request-notify] no admin WhatsApp — set companyWhatsApp in tenant settings');
      }
    } else if (kind === 'approved' && notifyClient) {
      const r = await whatsapp.sendWhatsAppMessage(
        clientPhone,
        buildClientApprovedMessage(request, companyName),
      );
      clientOk = r.ok;
      if (!r.ok) error = r.error;
    } else if (kind === 'rejected' && notifyClient) {
      const r = await whatsapp.sendWhatsAppMessage(
        clientPhone,
        buildClientRejectedMessage(request, companyName, extra.rejectReason),
      );
      clientOk = r.ok;
      if (!r.ok) error = r.error;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'whatsapp_failed';
    console.error('[loan-request-notify]', kind, error);
  }

  return {
    sent: clientOk || adminOk,
    client: clientOk,
    admin: adminOk,
    error,
  };
}

async function onLoanRequestCreated(request) {
  notify
    .createNotification({
      tenantId: request.tenantId,
      title: '📬 Nueva solicitud de crédito',
      message: `${request.client?.name || 'Cliente'} — ${money(request.amount)}`,
      type: 'SYSTEM',
      actionUrl: '/#/requests',
      sendPush: true,
    })
    .catch(() => {});

  return sendLoanRequestWhatsApp(request, 'created');
}

async function onLoanRequestApproved(request) {
  return sendLoanRequestWhatsApp(request, 'approved');
}

async function onLoanRequestRejected(request, rejectReason) {
  return sendLoanRequestWhatsApp(request, 'rejected', { rejectReason });
}

module.exports = {
  onLoanRequestCreated,
  onLoanRequestApproved,
  onLoanRequestRejected,
  sendLoanRequestWhatsApp,
};
