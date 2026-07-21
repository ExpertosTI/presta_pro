const express = require('express');
const router = express.Router();
const {
  whatsappConfigured,
  getWhatsAppConfigStatus,
  getConnectionState,
  getConnectQr,
} = require('../services/whatsappService');

// GET /api/whatsapp/status
router.get('/status', async (req, res) => {
  try {
    const config = getWhatsAppConfigStatus();
    if (!config.configured) {
      return res.json({
        configured: false,
        state: 'unconfigured',
        reason: config.reason,
      });
    }
    const live = await getConnectionState();
    res.json({
      configured: true,
      instance: live.instance || config.instance,
      clientNotify: config.clientNotify,
      state: live.state || 'unknown',
      ok: live.ok,
      error: live.error || null,
    });
  } catch (error) {
    console.error('[whatsapp] status error:', error.message);
    res.status(500).json({ error: 'Error al consultar estado de WhatsApp' });
  }
});

// GET /api/whatsapp/qr — genera / refresca QR de la instancia Evolution
router.get('/qr', async (req, res) => {
  try {
    if (!whatsappConfigured()) {
      return res.status(400).json({
        error: 'WhatsApp no está configurado en el servidor (EVOLUTION_*).',
        configured: false,
      });
    }

    const result = await getConnectQr();
    if (!result.ok) {
      return res.status(502).json({
        error: 'No se pudo obtener el QR de Evolution',
        detail: result.detail || result.error,
        instance: result.instance,
      });
    }

    // Already connected — no QR needed
    if (result.state === 'open' && !result.qrBase64) {
      return res.json({
        configured: true,
        connected: true,
        state: 'open',
        instance: result.instance,
        qrBase64: null,
        pairingCode: null,
        message: 'La instancia ya está conectada.',
      });
    }

    if (!result.qrBase64 && !result.pairingCode) {
      return res.json({
        configured: true,
        connected: false,
        state: result.state || 'connecting',
        instance: result.instance,
        qrBase64: null,
        pairingCode: null,
        message: 'Evolution no devolvió QR. Espera unos segundos y vuelve a intentar.',
      });
    }

    res.json({
      configured: true,
      connected: false,
      state: result.state || 'connecting',
      instance: result.instance,
      qrBase64: result.qrBase64,
      pairingCode: result.pairingCode,
      message: 'Escanea el código QR con WhatsApp → Dispositivos vinculados.',
    });
  } catch (error) {
    console.error('[whatsapp] qr error:', error.message);
    res.status(500).json({ error: 'Error al generar QR de WhatsApp' });
  }
});

module.exports = router;
