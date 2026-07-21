/**
 * WhatsApp payment receipt alerts (Evolution API).
 */

const prisma = require('../lib/prisma');
const whatsapp = require('./whatsappService');

function money(amount) {
  return `RD$${Number(amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function tenantContext(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, settings: true },
  });
  const settings = tenant?.settings || {};
  return {
    companyName: settings.companyName || tenant?.name || 'Presta Pro',
    companyWhatsApp: settings.companyWhatsApp || '',
  };
}

function buildPaymentReceiptMessage({
  companyName,
  clientName,
  amount,
  penaltyAmount = 0,
  installmentNumber,
  remainingBalance,
  receiptId,
  date = new Date(),
  notes,
}) {
  const total = Number(amount || 0) + Number(penaltyAmount || 0);
  const lines = [
    `✅ ${companyName}`,
    '',
    `Hola ${clientName || 'cliente'},`,
    '',
    'Recibimos tu pago. Aquí tienes el comprobante:',
    '',
    `💰 Monto: ${money(total)}`,
  ];
  if (penaltyAmount > 0) {
    lines.push(`   (Cuota ${money(amount)} + Mora ${money(penaltyAmount)})`);
  }
  if (installmentNumber != null) {
    lines.push(`📋 Cuota: #${installmentNumber}`);
  }
  lines.push(`📅 Fecha: ${new Date(date).toLocaleString('es-DO')}`);
  if (remainingBalance !== undefined && remainingBalance !== null) {
    lines.push(`📉 Saldo pendiente: ${money(remainingBalance)}`);
  }
  if (receiptId) {
    lines.push(`🧾 Ref: ${String(receiptId).slice(0, 12)}`);
  }
  if (notes) {
    lines.push('', `Nota: ${notes}`);
  }
  lines.push('', 'Gracias por tu pago.');
  return lines.join('\n');
}

/**
 * Send payment receipt to client WhatsApp (fire-and-forget safe).
 */
async function sendPaymentReceiptWhatsApp({
  tenantId,
  clientPhone,
  clientName,
  amount,
  penaltyAmount,
  installmentNumber,
  remainingBalance,
  receiptId,
  date,
  notes,
}) {
  if (!whatsapp.whatsappConfigured() || !whatsapp.clientNotifyEnabled()) {
    return { ok: false, error: 'whatsapp_disabled' };
  }
  if (!clientPhone) {
    return { ok: false, error: 'no_phone' };
  }

  const { companyName } = await tenantContext(tenantId);
  const text = buildPaymentReceiptMessage({
    companyName,
    clientName,
    amount,
    penaltyAmount,
    installmentNumber,
    remainingBalance,
    receiptId,
    date,
    notes,
  });

  return whatsapp.sendWhatsAppMessage(clientPhone, text);
}

module.exports = {
  sendPaymentReceiptWhatsApp,
  buildPaymentReceiptMessage,
};
