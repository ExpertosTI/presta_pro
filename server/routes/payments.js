const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// GET /api/payments - Obtener historial de pagos
router.get('/', async (req, res) => {
    try {
        const receipts = await prisma.receipt.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { date: 'desc' },
            take: 100 // Limitar a los últimos 100 para no sobrecargar
        });
        res.json(receipts);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Error al obtener pagos' });
    }
});

// POST /api/payments - Registrar un pago
router.post('/', async (req, res) => {
    try {
        const { loanId, amount, penaltyAmount, installmentNumber, date, notes } = req.body;

        // Verificar préstamo
        const loan = await prisma.loan.findFirst({
            where: { id: loanId, tenantId: req.user.tenantId },
            include: { installments: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Aquí debería ir la lógica compleja de aplicar pago a cuotas
        // Por simplicidad en esta fase inicial, asumimos que el frontend envía qué cuota se paga
        // O implementamos una lógica básica de actualización

        // Crear recibo
        const newReceipt = await prisma.receipt.create({
            data: {
                tenantId: req.user.tenantId,
                loanId,
                clientId: loan.clientId,
                amount: parseFloat(amount),
                penaltyAmount: parseFloat(penaltyAmount || 0),
                installmentNumber: installmentNumber || 0,
                date: date ? new Date(date) : new Date(),
                // Más campos si son necesarios
            }
        });

        // Actualizar estado del préstamo/cuota (Simplificado)
        // En una implementación real, esto debería ser más robusto
        // UPDATE installments logic...

        res.status(201).json(newReceipt);
    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

module.exports = router;
