const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';

let aiClient = null;
const getClient = () => {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return aiClient;
};

// Rate limit per tenant: max 30 requests per minute
const tenantRateMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

const checkTenantRate = (tenantId) => {
  const now = Date.now();
  const entry = tenantRateMap.get(tenantId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    tenantRateMap.set(tenantId, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
};

// POST /api/ai/chat — Proxy seguro para Gemini
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Asistente IA no configurado en el servidor.' });
    }

    const { history, message, systemInstruction } = req.body;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: 'Mensaje inválido (máximo 2000 caracteres).' });
    }

    if (!checkTenantRate(req.user.tenantId)) {
      return res.status(429).json({ error: 'Límite de consultas alcanzado. Espera un momento.' });
    }

    const client = getClient();

    const chatHistory = (history || []).slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: (msg.text || '').slice(0, 1500) }],
    }));

    const fullMessage = `${systemInstruction}\n\nConsulta del usuario: ${message}`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await client.models.generateContent({
          model: MODEL,
          contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: fullMessage }] }
          ],
        });
        return res.json({ text: response.text || 'No pude obtener una respuesta.' });
      } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          const delay = Math.pow(2, attempts) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }
        throw error;
      }
    }

    return res.status(429).json({ error: 'Asistente ocupado. Intenta en 1-2 minutos.' });
  } catch (err) {
    console.error('AI_CHAT_ERROR:', err.message);
    return res.status(500).json({ error: 'Error al procesar la consulta.' });
  }
});

// POST /api/ai/document — Genera documentos legales
router.post('/document', authMiddleware, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Asistente IA no configurado.' });
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
      return res.status(400).json({ error: 'Prompt inválido.' });
    }

    if (!checkTenantRate(req.user.tenantId)) {
      return res.status(429).json({ error: 'Límite alcanzado. Espera un momento.' });
    }

    const client = getClient();

    let attempts = 0;
    while (attempts < 3) {
      try {
        const response = await client.models.generateContent({
          model: MODEL,
          contents: prompt,
        });
        return res.json({ text: response.text || 'Error generando documento.' });
      } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
          attempts++;
          continue;
        }
        throw error;
      }
    }

    return res.status(429).json({ error: 'Servicio ocupado. Intenta en 1-2 minutos.' });
  } catch (err) {
    console.error('AI_DOCUMENT_ERROR:', err.message);
    return res.status(500).json({ error: 'Error generando documento.' });
  }
});

module.exports = router;
