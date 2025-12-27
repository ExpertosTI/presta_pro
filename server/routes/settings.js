const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');

router.use(authMiddleware);

// GET /api/settings - Obtener configuración actual
router.get('/', async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: {
                name: true,
                slug: true,
                settings: true
            }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant no encontrado' });
        }

        const settings = {
            companyName: tenant.name,
            tenantSlug: tenant.slug,
            ...(tenant.settings || {})
        };

        res.json(settings);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

// PUT /api/settings - Actualizar configuración
router.put('/', async (req, res) => {
    try {
        const { companyName, ...otherSettings } = req.body;

        if (!companyName) {
            return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: {
                name: companyName,
                settings: otherSettings
            },
            select: {
                name: true,
                settings: true
            }
        });

        logAudit({
            action: AUDIT_ACTIONS.SETTINGS_UPDATED,
            resource: 'settings',
            resourceId: req.user.tenantId,
            userId: req.user?.userId,
            tenantId: req.user.tenantId,
            details: { companyName, ...otherSettings },
            ipAddress: req.ip
        });

        const settings = {
            companyName: updatedTenant.name,
            ...(updatedTenant.settings || {})
        };

        res.json(settings);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});

// POST /api/settings/push-token - Register push notification token
router.post('/push-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { pushToken: token }
        });

        res.json({ success: true, message: 'Push token registrado' });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error saving push token:', error);
        res.status(500).json({ error: 'Error al guardar token' });
    }
});

module.exports = router;


