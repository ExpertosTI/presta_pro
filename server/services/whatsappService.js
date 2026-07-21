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

function evolutionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: env('EVOLUTION_API_KEY'),
  };
}

function evolutionBase() {
  return env('EVOLUTION_API_URL').replace(/\/$/, '');
}

function evolutionInstance() {
  return env('EVOLUTION_INSTANCE');
}

function normalizeState(payload) {
  const raw =
    payload?.instance?.state ||
    payload?.state ||
    payload?.status ||
    payload?.connectionStatus ||
    '';
  const s = String(raw).toLowerCase();
  if (s.includes('open') || s === 'connected') return 'open';
  if (s.includes('connect') || s === 'qr' || s === 'pairing') return 'connecting';
  if (s.includes('close') || s === 'disconnected') return 'close';
  return s || 'unknown';
}

function extractQrBase64(payload) {
  const candidates = [
    payload?.base64,
    payload?.qrcode?.base64,
    payload?.qr?.base64,
    payload?.qrcode?.code,
    typeof payload?.qrcode === 'string' ? payload.qrcode : null,
  ].filter(Boolean);

  const raw = candidates[0];
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('data:image')) return raw;
  if (raw.length > 100 && !raw.includes(' ')) {
    return `data:image/png;base64,${raw.replace(/^base64,/, '')}`;
  }
  return null;
}

async function getConnectionState() {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'not_configured', state: 'unconfigured' };
  }
  const instance = evolutionInstance();
  try {
    const res = await fetch(
      `${evolutionBase()}/instance/connectionState/${encodeURIComponent(instance)}`,
      { method: 'GET', headers: evolutionHeaders() },
    );
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      return {
        ok: false,
        error: `http_${res.status}`,
        state: 'unknown',
        instance,
        detail: String(text).slice(0, 200),
      };
    }

    return {
      ok: true,
      state: normalizeState(data),
      instance,
      clientNotify: clientNotifyEnabled(),
      data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'network_error',
      state: 'unknown',
      instance,
    };
  }
}

async function getConnectQr() {
  if (!whatsappConfigured()) {
    return { ok: false, error: 'not_configured' };
  }
  const instance = evolutionInstance();
  try {
    const res = await fetch(
      `${evolutionBase()}/instance/connect/${encodeURIComponent(instance)}`,
      { method: 'GET', headers: evolutionHeaders() },
    );
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!res.ok) {
      return {
        ok: false,
        error: `http_${res.status}`,
        instance,
        detail: String(text).slice(0, 300),
      };
    }

    const state = normalizeState(data);
    const qrBase64 = extractQrBase64(data);
    const pairingCode =
      data?.pairingCode ||
      data?.qrcode?.pairingCode ||
      data?.code ||
      null;

    return {
      ok: true,
      instance,
      state,
      qrBase64,
      pairingCode,
      data,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'network_error', instance };
  }
}

async function sendText(to, text) {
  const baseUrl = evolutionBase();
  const apiKey = env('EVOLUTION_API_KEY');
  const instance = evolutionInstance();
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
  getConnectionState,
  getConnectQr,
  sendWhatsAppMessage,
};
