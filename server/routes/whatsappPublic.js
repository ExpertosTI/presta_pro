const express = require('express');
const router = express.Router();
const {
  handleInboundWebhook,
  getLeadByToken,
  slugifyCompany,
} = require('../services/whatsappSignupService');

function assertWebhookSecret(req, res, next) {
  const expected = (process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY || '').trim();
  if (!expected) {
    // If no secret configured, still accept but log — deploy should set one
    console.warn('[wa-webhook] EVOLUTION_WEBHOOK_SECRET not set');
    return next();
  }
  const got =
    req.headers['x-evolution-secret'] ||
    req.headers['apikey'] ||
    req.query.secret ||
    '';
  if (String(got) !== expected) {
    return res.status(401).json({ error: 'Unauthorized webhook' });
  }
  return next();
}

// POST /api/whatsapp/webhook — Evolution inbound (public + secret)
router.post('/webhook', assertWebhookSecret, async (req, res) => {
  try {
    const result = await handleInboundWebhook(req.body || {});
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[wa-webhook]', error.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// GET /api/whatsapp/signup-lead/:token — public prefetch for LoginView
router.get('/signup-lead/:token', async (req, res) => {
  try {
    const lead = await getLeadByToken(req.params.token);
    if (!lead) {
      return res.status(404).json({ error: 'Enlace inválido o expirado' });
    }
    res.json({
      companyName: lead.companyName,
      adminEmail: lead.adminEmail,
      contactName: lead.contactName,
      suggestedSlug: slugifyCompany(lead.companyName),
      expiresAt: lead.expiresAt,
    });
  } catch (error) {
    console.error('[wa-signup-lead]', error.message);
    res.status(500).json({ error: 'Error al cargar lead' });
  }
});

module.exports = router;
