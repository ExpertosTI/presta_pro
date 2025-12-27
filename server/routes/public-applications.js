/**
 * Public Loan Applications API Routes
 * RenKredit by Renace.tech
 * 
 * IMPORTANT: These routes are PUBLIC (no authentication required)
 * Used for the public loan application portal
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

/**
 * POST /api/public/loan-application
 * Submit a new public loan application
 * No authentication required
 */
router.post('/loan-application', async (req, res) => {
    try {
        const {
            tenantSlug,
            applicantName,
            applicantPhone,
            applicantEmail,
            applicantIdNumber,
            applicantAddress,
            amountRequested,
            purpose,
            notes
        } = req.body;

        // Validate required fields
        if (!tenantSlug || !applicantName || !applicantPhone || !amountRequested) {
            return res.status(400).json({
                error: 'Campos requeridos: tenantSlug, applicantName, applicantPhone, amountRequested'
            });
        }

        // Find the tenant by slug
        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        // Check if tenant is active (not suspended)
        if (tenant.suspendedAt) {
            return res.status(403).json({ error: 'Esta empresa no está aceptando solicitudes actualmente' });
        }

        // Create the public loan application
        const application = await prisma.publicLoanApplication.create({
            data: {
                tenantId: tenant.id,
                applicantName: applicantName.trim(),
                applicantPhone: applicantPhone.trim(),
                applicantEmail: applicantEmail?.trim() || null,
                applicantIdNumber: applicantIdNumber?.trim() || null,
                applicantAddress: applicantAddress?.trim() || null,
                amountRequested: parseFloat(amountRequested),
                purpose: purpose?.trim() || null,
                notes: notes?.trim() || null,
                status: 'PENDING'
            }
        });

        // Create a notification for the tenant
        await prisma.notification.create({
            data: {
                tenantId: tenant.id,
                type: 'LOAN_APPLICATION',
                title: '📋 Nueva Solicitud de Préstamo',
                message: `${applicantName} ha solicitado un préstamo de RD$${parseFloat(amountRequested).toLocaleString('es-DO')}`,
                actionUrl: '/solicitudes-publicas',
                data: {
                    applicationId: application.id,
                    applicantName,
                    applicantPhone,
                    amountRequested: parseFloat(amountRequested)
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Solicitud enviada correctamente. Nos pondremos en contacto pronto.',
            applicationId: application.id
        });

    } catch (error) {
        console.error('Error creating public loan application:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud. Intente nuevamente.' });
    }
});

/**
 * GET /api/public/tenant/:slug
 * Get tenant public info (for displaying in the form)
 * No authentication required
 */
router.get('/tenant/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                suspendedAt: true,
                settings: true
            }
        });

        if (!tenant) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        if (tenant.suspendedAt) {
            return res.status(403).json({ error: 'Esta empresa no está aceptando solicitudes actualmente' });
        }

        // Return only public-safe information
        res.json({
            name: tenant.name,
            slug: tenant.slug,
            isActive: true
        });

    } catch (error) {
        console.error('Error fetching tenant info:', error);
        res.status(500).json({ error: 'Error al cargar información' });
    }
});

module.exports = router;
