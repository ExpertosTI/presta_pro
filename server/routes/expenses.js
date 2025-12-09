const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware de autenticación para todas las rutas de gastos
router.use(authMiddleware);

// GET /api/expenses - Obtener historial de gastos
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;

        const where = {
            tenantId: req.user.tenantId,
        };

        if (category) {
            where.category = category;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 100
        });

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Error al obtener gastos' });
    }
});

// POST /api/expenses - Registrar un gasto
router.post('/', async (req, res) => {
    try {
        const { description, amount, category, date, notes } = req.body;

        if (!description || !amount) {
            return res.status(400).json({ error: 'Descripción y monto son requeridos' });
        }

        const newExpense = await prisma.expense.create({
            data: {
                tenantId: req.user.tenantId,
                description,
                amount: parseFloat(amount),
                category: category || 'General',
                date: date ? new Date(date) : new Date(),
                notes
            }
        });

        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Error al registrar gasto' });
    }
});

// PUT /api/expenses/:id - Actualizar un gasto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, category, date, notes } = req.body;

        const expense = await prisma.expense.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                description,
                amount: amount ? parseFloat(amount) : undefined,
                category,
                date: date ? new Date(date) : undefined,
                notes
            }
        });

        res.json(updatedExpense);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Error al actualizar gasto' });
    }
});

// DELETE /api/expenses/:id - Eliminar un gasto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await prisma.expense.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        await prisma.expense.delete({
            where: { id }
        });

        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Error al eliminar gasto' });
    }
});

module.exports = router;
