const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// GET /api/loans
router.get('/', async (req, res) => {
    try {
        const loans = await prisma.loan.findMany({
            where: { tenantId: req.user.tenantId },
            include: {
                installments: true, // Incluir el cronograma de pagos
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(loans);
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Error al obtener préstamos' });
    }
});

// POST /api/loans - Crear préstamo
router.post('/', async (req, res) => {
    try {
        const { clientId, amount, rate, term, frequency, startDate, schedule } = req.body;

        if (!clientId || !amount || !schedule) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        // Verificar que el cliente existe y pertenece al tenant
        const client = await prisma.client.findFirst({
            where: { id: clientId, tenantId: req.user.tenantId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Crear préstamo y sus cuotas en una transacción
        const newLoan = await prisma.loan.create({
            data: {
                amount: parseFloat(amount),
                rate: parseFloat(rate),
                term: parseInt(term),
                frequency,
                startDate: new Date(startDate),
                status: 'ACTIVE',
                totalInterest: 0, // Se podría calcular sumando intereses de cuotas
                totalPaid: 0,
                tenantId: req.user.tenantId,
                clientId,
                installments: {
                    create: schedule.map(inst => ({
                        number: inst.number,
                        date: new Date(inst.date),
                        payment: parseFloat(inst.payment),
                        interest: parseFloat(inst.interest),
                        principal: parseFloat(inst.principal),
                        balance: parseFloat(inst.balance),
                        status: inst.status || 'PENDING'
                    }))
                }
            },
            include: {
                installments: true
            }
        });

        res.status(201).json(newLoan);
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({ error: 'Error al crear préstamo' });
    }
});

// PUT /api/loans/:id - Actualizar préstamo (status, pagos, etc)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, totalPaid, schedule } = req.body;

        // Verificar ownership
        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Actualizar datos principales del préstamo
        const updatedLoan = await prisma.loan.update({
            where: { id },
            data: {
                status: status || undefined,
                totalPaid: totalPaid !== undefined ? parseFloat(totalPaid) : undefined,
            }
        });

        // Actualizar cuotas si se envían
        if (schedule && Array.isArray(schedule)) {
            for (const inst of schedule) {
                // Solo actualizamos si tiene ID (asumimos que ya existen)
                if (inst.id) {
                    await prisma.loanInstallment.update({
                        where: { id: inst.id },
                        data: {
                            status: inst.status,
                            paidAmount: parseFloat(inst.paidAmount || 0),
                            paidDate: inst.paidDate ? new Date(inst.paidDate) : null,
                            penaltyPaid: parseFloat(inst.penaltyPaid || 0)
                        }
                    });
                }
            }
        }

        // Retornar préstamo completo actualizado
        const finalLoan = await prisma.loan.findUnique({
            where: { id },
            include: { installments: true }
        });

        res.json(finalLoan);
    } catch (error) {
        console.error('Error updating loan:', error);
        res.status(500).json({ error: 'Error al actualizar préstamo' });
    }
});

module.exports = router;
