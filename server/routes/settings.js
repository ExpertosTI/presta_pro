const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/settings - Obtener configuración actual
router.get('/', async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: {
                name: true,
                settings: true
            }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant no encontrado' });
        }

        // Combinar nombre del tenant con settings JSON
        const settings = {
            companyName: tenant.name,
            ...(tenant.settings || {})
        };

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

// PUT /api/settings - Actualizar configuración
router.put('/', async (req, res) => {
    try {
        const { companyName, ...otherSettings } = req.body;

        // Validar datos mínimos
        if (!companyName) {
            return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: {
                name: companyName,
                settings: otherSettings // Guardar resto de props en JSON
            },
            select: {
                name: true,
                settings: true
            }
        });

        const settings = {
            companyName: updatedTenant.name,
            ...(updatedTenant.settings || {})
        };

        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});

module.exports = router;
