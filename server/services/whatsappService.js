/**
 * Evolution API — WhatsApp outbound (Presta Pro / Renace)
 */

function env(name, fallback = '') {
  const raw = process.env[name] ?? fallback;
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** DO / US: 10 digits → 1XXXXXXXXXX */
function normalizePhoneDigits(raw) {
  const d = digitsOnly(raw);
  if (!d) return '';
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith('1')) return d;
  return d;
}

function maskPhone(raw) {
  const d = normalizePhoneDigits(raw);
  if (d.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}

function whatsappConfigured() {
  return Boolean(
    env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'),
  );
}

function clientNotifyEnabled() {
  const v = env('WHATSAPP_NOTIFY_CLIENT', 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function getWhatsAppConfigStatus() {
  if (!whatsappConfigured()) {
    return { configured: false, reason: 'EVOLUTION_* not set' };
  }
  return {
    configured: true,
    instance: env('EVOLUTION_INSTANCE'),
    clientNotify: clientNotifyEnabled(),
  };
}

async function sendText(to, text) {
  const baseUrl = env('EVOLUTION_API_URL').replace(/\/$/, '');
  const apiKey = env('EVOLUTION_API_KEY');
  const instance = env('EVOLUTION_INSTANCE');
  const phone = normalizePhoneDigits(to);
  if (!phone) return { ok: false, error: 'invalid_phone' };

  const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({ number: phone, text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.warn('[whatsapp] send failed', res.status, detail.slice(0, 200));
    return { ok: false, error: `http_${res.status}` };
  }
  return { ok: true };
}

async function sendWhatsAppMessage(to, text) {
  if (!whatsappConfigured()) return { ok: false, error: 'not_configured' };
  if (!to || !text) return { ok: false, error: 'missing_to_or_text' };
  return sendText(to, text);
}

module.exports = {
  normalizePhoneDigits,
  maskPhone,
  whatsappConfigured,
  clientNotifyEnabled,
  getWhatsAppConfigStatus,
  sendWhatsAppMessage,
};
