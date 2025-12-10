const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET all expenses for tenant
router.get('/', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Error fetching expenses' });
    }
});

// POST create new expense
router.post('/', async (req, res) => {
    try {
        const { description, amount, category, date, notes } = req.body;

        const expense = await prisma.expense.create({
            data: {
                description: description || 'Gasto',
                amount: parseFloat(amount) || 0,
                category: category || 'General',
                date: date ? new Date(date) : new Date(),
                notes: notes || null,
                tenantId: req.tenantId
            }
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Error creating expense' });
    }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.expense.delete({
            where: { id, tenantId: req.tenantId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Error deleting expense' });
    }
});

module.exports = router;
