const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');

// Middleware para asegurar autenticación en todas las rutas de clientes
// router.use(authMiddleware); 
// Nota: Es mejor aplicar el middleware en index.js o aquí si se tiene acceso al middleware.
// Asumiré que se pasa o se requiere. Como index.js lo tiene definido inline o no exportado,
// tendré que ver cómo reusarlo o moverlo a un archivo separado.
// Por ahora, escribiré la lógica asumiendo req.user existe (inyectado por authMiddleware)

// GET /api/clients - Obtener todos los clientes del tenant
router.get('/', async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { loans: true }
                }
            }
        });
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

// POST /api/clients - Crear un nuevo cliente
router.post('/', async (req, res) => {
    try {
        const { name, phone, address, idNumber, email, notes, photoUrl, lat, lng } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        // === SUBSCRIPTION LIMIT CHECK ===
        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: req.user.tenantId }
        });

        if (subscription) {
            const limits = typeof subscription.limits === 'string'
                ? JSON.parse(subscription.limits)
                : subscription.limits;

            if (limits?.maxClients && limits.maxClients > 0) {
                const currentClientCount = await prisma.client.count({
                    where: { tenantId: req.user.tenantId }
                });

                if (currentClientCount >= limits.maxClients) {
                    return res.status(403).json({
                        error: `Has alcanzado el límite de ${limits.maxClients} clientes de tu plan. Actualiza tu suscripción para agregar más.`,
                        limitReached: true,
                        currentCount: currentClientCount,
                        maxAllowed: limits.maxClients
                    });
                }
            }
        }
        // === END LIMIT CHECK ===

        const newClient = await prisma.client.create({
            data: {
                name,
                phone,
                address,
                idNumber,
                email,
                notes,
                photoUrl,
                // Si tienes campos de geolocalización en el schema, agrégalos aquí. 
                // Si no, ignora lat/lng o agrégalos al schema primero.
                tenantId: req.user.tenantId,
                collectorId: req.body.collectorId || null // Fix: Convert empty string to null
            }
        });

        // Log audit
        logAudit({
            action: AUDIT_ACTIONS.CLIENT_CREATED,
            resource: 'client',
            resourceId: newClient.id,
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            details: { name, phone, email },
            ipAddress: req.ip
        });

        res.status(201).json(newClient);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

// PUT /api/clients/:id - Actualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, idNumber, email, notes, photoUrl } = req.body;

        // Verificar que el cliente pertenezca al tenant verificado
        const existingClient = await prisma.client.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!existingClient) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: {
                name,
                phone,
                address,
                idNumber,
                email,
                notes,
                photoUrl,
                collectorId: req.body.collectorId || null // Allow updating collector
            }
        });

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

// GET /api/clients/:id/documents - Obtener documentos del cliente
router.get('/:id/documents', async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const documents = await prisma.clientDocument.findMany({
            where: { clientId: id, tenantId: req.user.tenantId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Error al obtener documentos' });
    }
});

// POST /api/clients/:id/documents - Agregar documento
router.post('/:id/documents', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, title, content, fileName, mimeType, dataUrl } = req.body;

        const client = await prisma.client.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const document = await prisma.clientDocument.create({
            data: {
                tenantId: req.user.tenantId,
                clientId: id,
                type: type || 'UPLOAD',
                title: title || 'Sin título',
                content,
                fileName,
                mimeType,
                dataUrl,
            }
        });

        // Registrar auditoría
        if (req.auditLogger) {
            // Si el logger existe, usarlo (opcional por ahora)
        }

        res.json(document);
    } catch (error) {
        console.error('Error adding document:', error);
        res.status(500).json({ error: 'Error al guardar documento' });
    }
});

// DELETE /api/clients/documents/:docId - Eliminar documento
router.delete('/documents/:docId', async (req, res) => {
    try {
        const { docId } = req.params;

        // Verify document belongs to tenant
        const document = await prisma.clientDocument.findFirst({
            where: { id: docId, tenantId: req.user.tenantId }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        await prisma.clientDocument.delete({
            where: { id: docId }
        });

        res.json({ success: true, message: 'Documento eliminado' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Error al eliminar documento' });
    }
});

// DELETE /api/clients/:id - Eliminar cliente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar ownership
        const existingClient = await prisma.client.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!existingClient) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Verificar si tiene préstamos activos
        const activeLoans = await prisma.loan.count({
            where: { clientId: id, status: 'ACTIVE' }
        });

        if (activeLoans > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar cliente con préstamos activos',
                details: `Este cliente tiene ${activeLoans} préstamo(s) activo(s)`
            });
        }

        // Delete related records first (cascade manually)
        await prisma.$transaction(async (tx) => {
            // Delete related documents
            await tx.clientDocument.deleteMany({ where: { clientId: id } });

            // Delete related loan requests
            await tx.loanRequest.deleteMany({ where: { clientId: id } });

            // Delete loan installments and then loans
            const clientLoans = await tx.loan.findMany({ where: { clientId: id } });
            for (const loan of clientLoans) {
                await tx.loanInstallment.deleteMany({ where: { loanId: loan.id } });
                await tx.receipt.deleteMany({ where: { loanId: loan.id } });
                await tx.freePayment.deleteMany({ where: { loanId: loan.id } });
            }
            await tx.loan.deleteMany({ where: { clientId: id } });

            // Finally delete client
            await tx.client.delete({ where: { id } });
        });

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting client:', error.message);
        res.status(500).json({
            error: 'Error al eliminar cliente',
            details: error.message
        });
    }
});

module.exports = router;
