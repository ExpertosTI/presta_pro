const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Note: authMiddleware applied at mount level in index.js

// GET all loan requests for tenant
router.get('/', async (req, res) => {
    try {
        const requests = await prisma.loanRequest.findMany({
            where: { tenantId: req.tenantId },
            include: {
                client: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        console.error('Error fetching loan requests:', error);
        res.status(500).json({ error: 'Error al cargar solicitudes' });
    }
});

// GET single loan request
router.get('/:id', async (req, res) => {
    try {
        const request = await prisma.loanRequest.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.tenantId
            },
            include: {
                client: true
            }
        });

        if (!request) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json(request);
    } catch (error) {
        console.error('Error fetching loan request:', error);
        res.status(500).json({ error: 'Error al cargar solicitud' });
    }
});

// POST create new loan request
router.post('/', async (req, res) => {
    try {
        const { clientId, amount, rate, term, frequency, startDate } = req.body;

        if (!clientId || !amount || !rate || !term || !frequency) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const request = await prisma.loanRequest.create({
            data: {
                tenantId: req.tenantId,
                clientId,
                amount: parseFloat(amount),
                rate: parseFloat(rate),
                term: parseInt(term),
                frequency,
                startDate: startDate ? new Date(startDate) : null,
                status: 'REVIEW'
            },
            include: {
                client: {
                    select: { id: true, name: true, phone: true }
                }
            }
        });

        res.status(201).json(request);
    } catch (error) {
        console.error('Error creating loan request:', error);
        res.status(500).json({ error: 'Error al crear solicitud' });
    }
});

// PUT approve loan request
router.put('/:id/approve', async (req, res) => {
    try {
        const request = await prisma.loanRequest.update({
            where: { id: req.params.id },
            data: { status: 'APPROVED' },
            include: {
                client: {
                    select: { id: true, name: true, phone: true }
                }
            }
        });

        res.json(request);
    } catch (error) {
        console.error('Error approving loan request:', error);
        res.status(500).json({ error: 'Error al aprobar solicitud' });
    }
});

// PUT reject loan request
router.put('/:id/reject', async (req, res) => {
    try {
        const request = await prisma.loanRequest.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED' },
            include: {
                client: {
                    select: { id: true, name: true, phone: true }
                }
            }
        });

        res.json(request);
    } catch (error) {
        console.error('Error rejecting loan request:', error);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
});

// DELETE loan request
router.delete('/:id', async (req, res) => {
    try {
        await prisma.loanRequest.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting loan request:', error);
        res.status(500).json({ error: 'Error al eliminar solicitud' });
    }
});

module.exports = router;
