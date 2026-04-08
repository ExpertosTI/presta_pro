const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// In-memory store for active collector locations (ephemeral — only while route is active)
// Key: `${tenantId}:${collectorId}`, Value: { lat, lng, accuracy, timestamp, collectorName }
const activeLocations = new Map();

// Cleanup stale locations older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, data] of activeLocations.entries()) {
    if (data.timestamp < cutoff) activeLocations.delete(key);
  }
}, 60 * 1000);

// POST /api/location/update — Collector sends their GPS position
router.post('/update', authMiddleware, (req, res) => {
  try {
    const { lat, lng, accuracy, collectorId, collectorName } = req.body;
    const tenantId = req.user.tenantId;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat y lng son requeridos.' });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Coordenadas inválidas.' });
    }

    const effectiveCollectorId = collectorId || req.user.userId;
    const key = `${tenantId}:${effectiveCollectorId}`;

    activeLocations.set(key, {
      lat,
      lng,
      accuracy: accuracy || null,
      timestamp: Date.now(),
      collectorId: effectiveCollectorId,
      collectorName: collectorName || 'Cobrador',
      userId: req.user.userId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('LOCATION_UPDATE_ERROR:', err.message);
    res.status(500).json({ error: 'Error al guardar ubicación.' });
  }
});

// DELETE /api/location/clear — Collector clears their location (route finished)
router.delete('/clear', authMiddleware, (req, res) => {
  const tenantId = req.user.tenantId;
  const collectorId = req.body?.collectorId || req.user.userId;
  const key = `${tenantId}:${collectorId}`;
  activeLocations.delete(key);
  res.json({ ok: true });
});

// GET /api/location/active — Supervisor gets all active collector locations for their tenant
router.get('/active', authMiddleware, (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const results = [];

    for (const [key, data] of activeLocations.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        results.push({
          collectorId: data.collectorId,
          collectorName: data.collectorName,
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          lastUpdate: new Date(data.timestamp).toISOString(),
          minutesAgo: Math.round((Date.now() - data.timestamp) / 60000),
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('LOCATION_ACTIVE_ERROR:', err.message);
    res.status(500).json({ error: 'Error al obtener ubicaciones.' });
  }
});

module.exports = router;
