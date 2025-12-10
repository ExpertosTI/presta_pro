const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Note: authMiddleware applied at mount level in index.js

// GET all employees for tenant
router.get('/', async (req, res) => {
    try {
        const employees = await prisma.employee.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Error fetching employees' });
    }
});

// POST create new employee
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, position, salary, hireDate, photoUrl, status } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const employee = await prisma.employee.create({
            data: {
                name: name.trim(),
                phone: phone || null,
                email: email || null,
                position: position || null,
                salary: salary ? parseFloat(salary) : null,
                hireDate: hireDate ? new Date(hireDate) : null,
                photoUrl: photoUrl || null,
                status: status || 'ACTIVE',
                tenantId: req.tenantId
            }
        });

        res.status(201).json(employee);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Error creating employee' });
    }
});

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, position, salary, hireDate, photoUrl, status } = req.body;

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                name: name?.trim(),
                phone: phone || null,
                email: email || null,
                position: position || null,
                salary: salary ? parseFloat(salary) : null,
                hireDate: hireDate ? new Date(hireDate) : null,
                photoUrl: photoUrl || null,
                status: status || 'ACTIVE'
            }
        });

        res.json(employee);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Error updating employee' });
    }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.employee.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Error deleting employee' });
    }
});

module.exports = router;
