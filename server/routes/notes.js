const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Note: authMiddleware applied at mount level in index.js

// GET all notes for tenant
router.get('/', async (req, res) => {
    try {
        const notes = await prisma.note.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Error fetching notes' });
    }
});

// POST create new note
router.post('/', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const note = await prisma.note.create({
            data: {
                text: text.trim(),
                tenantId: req.tenantId
            }
        });

        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Error creating note' });
    }
});

// PUT update note
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        const note = await prisma.note.update({
            where: { id },
            data: {
                text: text?.trim()
            }
        });

        res.json(note);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Error updating note' });
    }
});

// DELETE note
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.note.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Error deleting note' });
    }
});

module.exports = router;
