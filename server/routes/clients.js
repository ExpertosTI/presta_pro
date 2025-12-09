const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware'); // Asegúrate de tener este middleware o exportarlo desde index.js

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
                collectorId: req.body.collectorId // Opcional: asignar a un cobrador
            }
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
                photoUrl
            }
        });

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Error al actualizar cliente' });
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

        // Opcional: Verificar si tiene préstamos activos antes de borrar
        /*
        const activeLoans = await prisma.loan.count({
          where: { clientId: id, status: 'ACTIVE' }
        });
        if (activeLoans > 0) {
          return res.status(400).json({ error: 'No se puede eliminar cliente con préstamos activos' });
        }
        */

        await prisma.client.delete({
            where: { id }
        });

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

module.exports = router;
