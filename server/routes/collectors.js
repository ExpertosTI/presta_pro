const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET all collectors for tenant
router.get('/', async (req, res) => {
    try {
        const collectors = await prisma.collector.findMany({
            where: { tenantId: req.tenantId },
            include: {
                clients: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(collectors);
    } catch (error) {
        console.error('Error fetching collectors:', error);
        res.status(500).json({ error: 'Error fetching collectors' });
    }
});

// POST create new collector
router.post('/', async (req, res) => {
    try {
        const { name, phone, photoUrl } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const collector = await prisma.collector.create({
            data: {
                name: name.trim(),
                phone: phone || null,
                tenantId: req.tenantId
            }
        });

        res.status(201).json(collector);
    } catch (error) {
        console.error('Error creating collector:', error);
        res.status(500).json({ error: 'Error creating collector' });
    }
});

// PUT update collector
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, photoUrl } = req.body;

        const collector = await prisma.collector.update({
            where: { id, tenantId: req.tenantId },
            data: {
                name: name?.trim(),
                phone: phone || null
            }
        });

        res.json(collector);
    } catch (error) {
        console.error('Error updating collector:', error);
        res.status(500).json({ error: 'Error updating collector' });
    }
});

// DELETE collector
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First unassign all clients from this collector
        await prisma.client.updateMany({
            where: { collectorId: id, tenantId: req.tenantId },
            data: { collectorId: null }
        });

        await prisma.collector.delete({
            where: { id, tenantId: req.tenantId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting collector:', error);
        res.status(500).json({ error: 'Error deleting collector' });
    }
});

module.exports = router;
