/**
 * WhatsApp OTP for tenant (company) signup — outbound only (no WhatsApp Web).
 */

const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendWhatsAppMessage, normalizePhoneDigits, whatsappConfigured } = require('./whatsappService');

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFY_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSignupOtp(rawPhone) {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'WhatsApp no está configurado en el servidor' };
  }
  const phone = normalizePhoneDigits(rawPhone);
  if (!phone || phone.length < 10) {
    return { ok: false, error: 'Número de WhatsApp inválido' };
  }

  const recent = await prisma.whatsAppOtp.findFirst({
    where: {
      phone,
      purpose: 'tenant_signup',
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && !recent.verifiedAt) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
    return { ok: false, error: `Espera ${wait}s antes de pedir otro código` };
  }

  const code = generateCode();
  const row = await prisma.whatsAppOtp.create({
    data: {
      phone,
      purpose: 'tenant_signup',
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const msg =
    `*Presta Pro* — Código de verificación\n\n` +
    `Tu código es: *${code}*\n\n` +
    `Válido por 10 minutos. Si no pediste este código, ignora el mensaje.`;

  const sent = await sendWhatsAppMessage(phone, msg);
  if (!sent.ok) {
    console.warn('[wa-otp] send failed', sent.error);
    return {
      ok: false,
      error: 'No se pudo enviar el WhatsApp. Revisa el número o intenta más tarde.',
    };
  }

  return {
    ok: true,
    phone,
    expiresAt: row.expiresAt,
    maskedPhone: `***${phone.slice(-4)}`,
  };
}

async function verifySignupOtp(rawPhone, code) {
  const phone = normalizePhoneDigits(rawPhone);
  const codeStr = String(code || '').trim();
  if (!phone || !/^\d{6}$/.test(codeStr)) {
    return { ok: false, error: 'Código inválido' };
  }

  const row = await prisma.whatsAppOtp.findFirst({
    where: {
      phone,
      purpose: 'tenant_signup',
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!row) {
    return { ok: false, error: 'Código expirado o no solicitado. Pide uno nuevo.' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Demasiados intentos. Pide un código nuevo.' };
  }

  if (row.codeHash !== hashCode(codeStr)) {
    await prisma.whatsAppOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: 'Código incorrecto' };
  }

  const verifyToken = crypto.randomBytes(24).toString('hex');
  await prisma.whatsAppOtp.update({
    where: { id: row.id },
    data: {
      verifiedAt: new Date(),
      verifyToken,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });

  return { ok: true, phone, verifyToken };
}

async function consumeVerifyToken(rawPhone, verifyToken) {
  const phone = normalizePhoneDigits(rawPhone);
  if (!phone || !verifyToken) return { ok: false, error: 'Verificación WhatsApp requerida' };

  const row = await prisma.whatsAppOtp.findFirst({
    where: {
      phone,
      purpose: 'tenant_signup',
      verifyToken,
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    return { ok: false, error: 'Verificación WhatsApp inválida o expirada' };
  }

  // One-time use
  await prisma.whatsAppOtp.update({
    where: { id: row.id },
    data: { verifyToken: null },
  });

  return { ok: true, phone };
}

module.exports = {
  sendSignupOtp,
  verifySignupOtp,
  consumeVerifyToken,
  normalizePhoneDigits,
};
