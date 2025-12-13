const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');

// Note: authMiddleware applied at mount level in index.js

// GET all expenses for tenant
router.get('/', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Error fetching expenses' });
    }
});

// POST create new expense
router.post('/', async (req, res) => {
    try {
        const { description, amount, category, date } = req.body;

        const expense = await prisma.expense.create({
            data: {
                description: description || 'Gasto',
                amount: parseFloat(amount) || 0,
                category: category || 'General',
                date: date ? new Date(date) : new Date(),
                tenantId: req.tenantId
            }
        });

        logAudit({
            action: AUDIT_ACTIONS.EXPENSE_CREATED,
            resource: 'expense',
            resourceId: expense.id,
            userId: req.user?.userId,
            tenantId: req.tenantId,
            details: { description, amount, category },
            ipAddress: req.ip
        });

        res.status(201).json(expense);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error creating expense:', error);
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

        logAudit({
            action: AUDIT_ACTIONS.EXPENSE_DELETED,
            resource: 'expense',
            resourceId: id,
            userId: req.user?.userId,
            tenantId: req.tenantId,
            ipAddress: req.ip
        });

        res.json({ success: true });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Error deleting expense' });
    }
});

module.exports = router;

