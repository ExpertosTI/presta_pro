/**
 * Route Closings API Routes
 * PrestaPro by Renace.tech
 * 
 * Manages collector route closings (cierres de ruta)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

/**
 * GET /api/route-closings - Get all route closings for tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        const closings = await prisma.routeClosing.findMany({
            where: { tenantId },
            include: {
                collector: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { date: 'desc' },
            take: 100 // Limit to last 100 closings
        });

        res.json(closings);
    } catch (error) {
        console.error('Error fetching route closings:', error);
        res.status(500).json({ error: 'Error fetching route closings' });
    }
});

/**
 * GET /api/route-closings/collector/:collectorId - Get closings for specific collector
 */
router.get('/collector/:collectorId', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { collectorId } = req.params;

        const closings = await prisma.routeClosing.findMany({
            where: {
                tenantId,
                collectorId
            },
            orderBy: { date: 'desc' },
            take: 30
        });

        res.json(closings);
    } catch (error) {
        console.error('Error fetching collector closings:', error);
        res.status(500).json({ error: 'Error fetching collector closings' });
    }
});

/**
 * POST /api/route-closings - Create a new route closing
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { collectorId, date, totalAmount, receiptsCount, notes } = req.body;

        if (!collectorId || !date || totalAmount === undefined) {
            return res.status(400).json({ error: 'Missing required fields: collectorId, date, totalAmount' });
        }

        // Verify collector belongs to tenant
        const collector = await prisma.collector.findFirst({
            where: { id: collectorId, tenantId }
        });

        if (!collector) {
            return res.status(404).json({ error: 'Collector not found' });
        }

        const closing = await prisma.routeClosing.create({
            data: {
                tenantId,
                collectorId,
                date: new Date(date),
                totalAmount: parseFloat(totalAmount) || 0,
                receiptsCount: parseInt(receiptsCount) || 0,
                notes: notes || null
            },
            include: {
                collector: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json(closing);
    } catch (error) {
        console.error('Error creating route closing:', error);
        res.status(500).json({ error: 'Error creating route closing' });
    }
});

/**
 * DELETE /api/route-closings/:id - Delete a route closing
 */
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        const { id } = req.params;

        // Verify closing belongs to tenant
        const existing = await prisma.routeClosing.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Route closing not found' });
        }

        await prisma.routeClosing.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting route closing:', error);
        res.status(500).json({ error: 'Error deleting route closing' });
    }
});

module.exports = router;
