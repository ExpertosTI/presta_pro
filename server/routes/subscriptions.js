const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAdminNotificationEmail, BRAND_NAME } = require('../emailTemplates');

// Multer config for proof uploads
const uploadsDir = path.join(__dirname, '../uploads/proofs');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo imágenes y PDF permitidos'));
        }
    }
});

// GET /plans
router.get('/plans', (req, res) => {
    // Return static plans for now, or fetch from DB if you have a Plan model
    const plans = [
        {
            id: 'FREE',
            name: 'Plan Gratis',
            monthlyPrice: 0,
            yearlyPrice: 0,
            monthlyPriceFormatted: 'RD$0.00',
            yearlyPriceFormatted: 'RD$0.00',
            features: ['10 clientes', '5 préstamos activos', '1 usuario', 'Sin acceso a IA', 'Expira en 30 días'],
        },
        {
            id: 'PRO',
            name: 'Plan Profesional',
            monthlyPrice: 800,
            yearlyPrice: 8000,
            monthlyPriceFormatted: 'RD$800.00',
            yearlyPriceFormatted: 'RD$8,000.00',
            features: ['100 clientes', '50 préstamos activos', '5 usuarios', '100 consultas AI/mes'],
        },
        {
            id: 'ENTERPRISE',
            name: 'Plan Empresarial',
            monthlyPrice: 1400,
            yearlyPrice: 14000,
            monthlyPriceFormatted: 'RD$1,400.00',
            yearlyPriceFormatted: 'RD$14,000.00',
            features: ['Clientes ilimitados', 'Préstamos ilimitados', 'Usuarios ilimitados', 'AI ilimitado', 'Soporte prioritario'],
        }
    ];
    res.json(plans);
});

// POST /upgrade (Azul integration placeholder)
router.post('/upgrade', async (req, res) => {
    const { plan, interval, paymentMethod } = req.body;
    const tId = req.user.tenantId;

    try {
        // Here you would integrate with Azul. For now, we simulate a successful request 
        // or return instructions.

        if (paymentMethod === 'AZUL') {
            // Return dummy redirect for demo purposes or error if no creds
            return res.json({
                method: 'AZUL',
                redirectUrl: 'https://pruebas.azul.com.do/PaymentPage/', // Placeholder
                formData: {
                    // Azul require fields
                    MerchantId: 'SAMPLE_MERCHANT',
                    // ...
                }
            });
        }

        return res.status(400).json({ error: 'Método de pago no soportado en este endpoint' });
    } catch (error) {
        console.error('Upgrade error:', error);
        res.status(500).json({ error: 'Error procesando solicitud' });
    }
});

// POST /upload-proof (Manual payments)
router.post('/upload-proof', upload.single('proof'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const { plan, method, amount } = req.body;
        const tId = req.user.tenantId;

        const tenant = await prisma.tenant.findUnique({ where: { id: tId }, include: { users: true } });
        const user = tenant.users.find(u => u.id === req.user.userId);

        // Notify Admin
        // You'd use nodemailer here similar to index.js
        // For now we just log it and return success
        console.log(`[PROOF UPLOAD] Tenant: ${tenant.slug}, Plan: ${plan}, File: ${req.file.path}`);

        res.json({ success: true, message: 'Comprobante recibido. Pendiente de aprobación.' });

    } catch (error) {
        console.error('Proof upload error:', error);
        res.status(500).json({ error: 'Error subiendo comprobante' });
    }
});

module.exports = router;
