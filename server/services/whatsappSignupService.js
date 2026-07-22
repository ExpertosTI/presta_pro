/**
 * Platform WhatsApp signup for new tenant companies (not borrowers).
 * Conversational lead → one-time web link to set slug + password.
 */

const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendWhatsAppMessage, normalizePhoneDigits } = require('./whatsappService');

const APP_BASE = () => (process.env.APP_BASE_URL || 'https://prestanace.renace.tech').replace(/\/$/, '');
const LEAD_TTL_MS = 48 * 60 * 60 * 1000;

function extractInbound(payload) {
  // Evolution v2 shapes vary
  const data = payload?.data || payload;
  const key = data?.key || {};
  const remote =
    key?.remoteJid ||
    data?.remoteJid ||
    payload?.sender ||
    '';
  const phoneRaw = String(remote).split('@')[0].replace(/\D/g, '');
  const text =
    data?.message?.conversation ||
    data?.message?.extendedTextMessage?.text ||
    data?.text ||
    payload?.text ||
    '';
  const fromMe = Boolean(key?.fromMe || data?.fromMe);
  return {
    phone: normalizePhoneDigits(phoneRaw) || phoneRaw,
    text: String(text || '').trim(),
    fromMe,
    instance:
      payload?.instance ||
      data?.instance ||
      payload?.instanceName ||
      process.env.EVOLUTION_INSTANCE ||
      '',
  };
}

async function reply(phone, text) {
  if (!phone || !text) return;
  try {
    await sendWhatsAppMessage(phone, text);
  } catch (err) {
    console.warn('[wa-signup] reply failed', err.message);
  }
}

async function getOrCreateLead(phone) {
  const active = await prisma.tenantSignupLead.findFirst({
    where: {
      contactPhone: phone,
      consumedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      step: { not: 'cancelled' },
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (active && active.step !== 'done') return active;

  return prisma.tenantSignupLead.create({
    data: {
      contactPhone: phone,
      step: 'ask_company',
      expiresAt: new Date(Date.now() + LEAD_TTL_MS),
      source: 'whatsapp',
    },
  });
}

function slugifyCompany(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function finalizeLeadLink(lead) {
  const token = crypto.randomBytes(24).toString('hex');
  const updated = await prisma.tenantSignupLead.update({
    where: { id: lead.id },
    data: {
      step: 'send_link',
      completionToken: token,
      expiresAt: new Date(Date.now() + LEAD_TTL_MS),
    },
  });
  const url = `${APP_BASE()}/?waSignup=${token}`;
  return { lead: updated, url };
}

async function notifyPlatformAdmin(lead) {
  const adminPhone = (process.env.PLATFORM_WHATSAPP_NOTIFY || '').replace(/\D/g, '');
  const msg =
    `🆕 Lead WhatsApp Presta Pro\n` +
    `Empresa: ${lead.companyName || '—'}\n` +
    `Email: ${lead.adminEmail || '—'}\n` +
    `Contacto: ${lead.contactName || '—'} (${lead.contactPhone})`;
  if (adminPhone) {
    await reply(adminPhone, msg);
  }
  console.log('[wa-signup] lead ready', lead.id, lead.adminEmail);
}

/**
 * Process one inbound Evolution webhook event.
 */
async function handleInboundWebhook(payload) {
  const inbound = extractInbound(payload);
  if (!inbound.phone || inbound.fromMe) {
    return { ok: true, skipped: true };
  }
  if (!inbound.text) {
    return { ok: true, skipped: true, reason: 'empty' };
  }

  const cmd = inbound.text.toUpperCase();
  let lead = await getOrCreateLead(inbound.phone);

  if (cmd === 'CANCELAR') {
    await prisma.tenantSignupLead.update({
      where: { id: lead.id },
      data: { step: 'cancelled' },
    });
    await reply(inbound.phone, 'Registro cancelado. Escribe REGISTRO cuando quieras intentarlo de nuevo.');
    return { ok: true, cancelled: true };
  }

  if (cmd === 'HOLA' || cmd === 'REGISTRO' || cmd === 'MENU') {
    lead = await prisma.tenantSignupLead.update({
      where: { id: lead.id },
      data: {
        step: 'ask_company',
        companyName: null,
        adminEmail: null,
        contactName: null,
        completionToken: null,
        consumedAt: null,
        expiresAt: new Date(Date.now() + LEAD_TTL_MS),
      },
    });
    await reply(
      inbound.phone,
      '👋 Bienvenido a *Presta Pro*.\n\nVamos a registrar tu *empresa / financiera*.\n\n1️⃣ ¿Cómo se llama tu empresa?\n\n(Escribe CANCELAR para salir)',
    );
    return { ok: true, step: lead.step };
  }

  if (lead.step === 'ask_company') {
    const companyName = inbound.text.slice(0, 120);
    await prisma.tenantSignupLead.update({
      where: { id: lead.id },
      data: { companyName, step: 'ask_email' },
    });
    await reply(inbound.phone, `Perfecto. Empresa: *${companyName}*\n\n2️⃣ ¿Cuál es el correo del administrador?`);
    return { ok: true, step: 'ask_email' };
  }

  if (lead.step === 'ask_email') {
    const email = inbound.text.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await reply(inbound.phone, 'Ese correo no parece válido. Envíalo de nuevo (ej. admin@empresa.com).');
      return { ok: true, step: 'ask_email' };
    }
    await prisma.tenantSignupLead.update({
      where: { id: lead.id },
      data: { adminEmail: email, step: 'ask_contact_name' },
    });
    await reply(inbound.phone, '3️⃣ ¿Cuál es tu nombre (contacto / dueño)?');
    return { ok: true, step: 'ask_contact_name' };
  }

  if (lead.step === 'ask_contact_name') {
    const contactName = inbound.text.slice(0, 80);
    lead = await prisma.tenantSignupLead.update({
      where: { id: lead.id },
      data: { contactName, step: 'send_link' },
    });
    const { url } = await finalizeLeadLink(lead);
    await notifyPlatformAdmin({ ...lead, contactName });
    await reply(
      inbound.phone,
      `✅ Datos recibidos.\n\nPara *seguridad*, elige tu contraseña y slug en este enlace (válido 48h):\n${url}\n\nNo compartas el enlace. Luego verifica tu correo.`,
    );
    return { ok: true, step: 'send_link', url };
  }

  if (lead.step === 'send_link' || lead.step === 'done') {
    if (lead.completionToken && !lead.consumedAt) {
      const url = `${APP_BASE()}/?waSignup=${lead.completionToken}`;
      await reply(inbound.phone, `Tu enlace de registro sigue activo:\n${url}\n\nEscribe REGISTRO para empezar de nuevo.`);
    } else {
      await reply(inbound.phone, 'Escribe *REGISTRO* para abrir una cuenta de empresa en Presta Pro.');
    }
    return { ok: true, step: lead.step };
  }

  await reply(inbound.phone, 'Escribe *REGISTRO* para crear tu cuenta de empresa en Presta Pro.');
  return { ok: true };
}

async function getLeadByToken(token) {
  if (!token) return null;
  return prisma.tenantSignupLead.findFirst({
    where: {
      completionToken: token,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

module.exports = {
  extractInbound,
  handleInboundWebhook,
  getLeadByToken,
  slugifyCompany,
  APP_BASE,
};
