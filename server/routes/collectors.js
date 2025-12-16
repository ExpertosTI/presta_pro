/**
 * Collectors API Routes - EXPANDED
 * PrestaPro by Renace.tech
 * 
 * Includes: CRUD, Authentication, Permissions, Activity Tracking
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const SALT_ROUNDS = 12;
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes except /login
router.use((req, res, next) => {
    if (req.path === '/login') return next();
    return authMiddleware(req, res, next);
});

// Default permissions for new collectors
const DEFAULT_PERMISSIONS = {
    canViewAllClients: false,
    canRegisterPayments: true,
    canApplyPenalties: true,
    canViewLoanDetails: true,
    canViewClientDocuments: false,
    canEditClients: false,
    canViewReports: false,
    maxPaymentAmount: null
};

// Generate random password
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// ============================================
// CRUD OPERATIONS (Admin/Owner only)
// ============================================

/**
 * GET /api/collectors - Get all collectors for tenant
 */
router.get('/', async (req, res) => {
    try {
        const collectors = await prisma.collector.findMany({
            where: { tenantId: req.tenantId },
            include: {
                clients: { select: { id: true, name: true } },
                _count: {
                    select: { activities: true, routeClosings: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Don't expose password hash
        const safeCollectors = collectors.map(c => ({
            ...c,
            passwordHash: undefined,
            hasCredentials: !!c.username && !!c.passwordHash
        }));

        res.json(safeCollectors);
    } catch (error) {
        console.error('Error fetching collectors:', error);
        res.status(500).json({ error: 'Error fetching collectors' });
    }
});

/**
 * POST /api/collectors - Create new collector with optional credentials
 */
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, photoUrl, createCredentials, username } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nombre requerido' });
        }

        let passwordHash = null;
        let tempPassword = null;
        let finalUsername = null;

        // Create credentials if requested
        if (createCredentials) {
            finalUsername = username?.trim().toLowerCase() || name.trim().toLowerCase().replace(/\s+/g, '.');

            // Check if username exists for this tenant
            const existing = await prisma.collector.findFirst({
                where: { tenantId: req.tenantId, username: finalUsername }
            });

            if (existing) {
                return res.status(400).json({ error: 'Username ya existe. Intenta con otro.' });
            }

            tempPassword = generatePassword();
            passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        }

        const collector = await prisma.collector.create({
            data: {
                name: name.trim(),
                phone: phone || null,
                email: email || null,
                photoUrl: photoUrl || null,
                username: finalUsername,
                passwordHash,
                permissions: DEFAULT_PERMISSIONS,
                commissionRate: req.body.commissionRate ? parseFloat(req.body.commissionRate) : 5,
                tenantId: req.tenantId
            }
        });

        // Send welcome email if email provided
        if (createCredentials && email && tempPassword) {
            const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
            await emailService.sendCollectorWelcomeEmail({
                to: email,
                tenantName: tenant?.name || 'PrestaPro',
                tenantSlug: tenant?.slug,
                collectorName: name,
                username: finalUsername,
                temporaryPassword: tempPassword
            });
        }

        res.status(201).json({
            ...collector,
            passwordHash: undefined,
            temporaryPassword: tempPassword // Only returned on creation
        });
    } catch (error) {
        console.error('Error creating collector:', error);
        res.status(500).json({ error: 'Error creating collector' });
    }
});

/**
 * PUT /api/collectors/:id - Update collector
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, photoUrl, isActive, commissionRate, lastLatitude, lastLongitude } = req.body;

        const collector = await prisma.collector.update({
            where: { id, tenantId: req.tenantId },
            data: {
                name: name?.trim(),
                phone: phone || null,
                email: email || null,
                photoUrl: photoUrl || null,
                isActive: isActive !== undefined ? isActive : undefined,
                commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : undefined,
                lastLatitude: lastLatitude !== undefined ? parseFloat(lastLatitude) : undefined,
                lastLongitude: lastLongitude !== undefined ? parseFloat(lastLongitude) : undefined
            }
        });

        res.json({ ...collector, passwordHash: undefined });
    } catch (error) {
        console.error('Error updating collector:', error);
        res.status(500).json({ error: 'Error updating collector' });
    }
});

/**
 * PUT /api/collectors/:id/permissions - Update collector permissions
 */
router.put('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ error: 'Permisos inválidos' });
        }

        const collector = await prisma.collector.update({
            where: { id, tenantId: req.tenantId },
            data: { permissions }
        });

        res.json({ success: true, permissions: collector.permissions });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

/**
 * POST /api/collectors/:id/reset-password - Reset collector password
 */
router.post('/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;

        const collector = await prisma.collector.findFirst({
            where: { id, tenantId: req.tenantId }
        });

        if (!collector) {
            return res.status(404).json({ error: 'Cobrador no encontrado' });
        }

        if (!collector.username) {
            return res.status(400).json({ error: 'El cobrador no tiene credenciales configuradas' });
        }

        const newPassword = generatePassword();
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.collector.update({
            where: { id },
            data: { passwordHash }
        });

        // Send email with new password if email exists
        if (collector.email) {
            const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
            await emailService.sendCollectorWelcomeEmail({
                to: collector.email,
                tenantName: tenant?.name || 'PrestaPro',
                collectorName: collector.name,
                username: collector.username,
                temporaryPassword: newPassword
            });
        }

        res.json({
            success: true,
            newPassword, // Return for admin to share manually if no email
            message: collector.email ? 'Nueva contraseña enviada por email' : 'Nueva contraseña generada'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
});

/**
 * DELETE /api/collectors/:id - Delete collector
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Unassign all clients
        await prisma.client.updateMany({
            where: { collectorId: id, tenantId: req.tenantId },
            data: { collectorId: null }
        });

        await prisma.collector.delete({
            where: { id, tenantId: req.tenantId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting collector:', error);
        res.status(500).json({ error: 'Error deleting collector' });
    }
});

// ============================================
// AUTHENTICATION (Public endpoints)
// ============================================

/**
 * POST /api/collectors/login - Collector login
 * Note: This endpoint is mounted WITHOUT auth middleware
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password, tenantSlug } = req.body;

        if (!username || !password || !tenantSlug) {
            return res.status(400).json({ error: 'Username, password y tenant requeridos' });
        }

        // Find tenant
        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug.toLowerCase() }
        });

        if (!tenant) {
            return res.status(401).json({ error: 'Empresa no encontrada' });
        }

        // Find collector
        const collector = await prisma.collector.findFirst({
            where: {
                tenantId: tenant.id,
                username: username.toLowerCase()
            }
        });

        if (!collector || !collector.passwordHash) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!collector.isActive) {
            return res.status(401).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, collector.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Update last login
        await prisma.collector.update({
            where: { id: collector.id },
            data: { lastLoginAt: new Date() }
        });

        // Log activity
        await prisma.collectorActivity.create({
            data: {
                collectorId: collector.id,
                tenantId: tenant.id,
                action: 'LOGIN',
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent']
            }
        });

        // Generate token
        const token = jwt.sign({
            collectorId: collector.id,
            tenantId: tenant.id,
            role: 'collector',
            permissions: collector.permissions
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            token,
            mustChangePassword: collector.mustChangePassword ?? true,
            collector: {
                id: collector.id,
                name: collector.name,
                email: collector.email,
                phone: collector.phone,
                photoUrl: collector.photoUrl,
                permissions: collector.permissions
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug
            }
        });
    } catch (error) {
        console.error('Collector login error:', error);
        res.status(500).json({ error: 'Error en login' });
    }
});

/**
 * POST /api/collectors/change-password - Change collector password
 * Requires collector token
 */
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword, collectorId } = req.body;

        if (!currentPassword || !newPassword || !collectorId) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Find collector
        const collector = await prisma.collector.findUnique({
            where: { id: collectorId }
        });

        if (!collector || !collector.passwordHash) {
            return res.status(404).json({ error: 'Cobrador no encontrado' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, collector.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password and set mustChangePassword to false
        await prisma.collector.update({
            where: { id: collectorId },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false
            }
        });

        // Log activity
        await prisma.collectorActivity.create({
            data: {
                collectorId: collector.id,
                tenantId: collector.tenantId,
                action: 'CHANGE_PASSWORD',
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent']
            }
        });

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * GET /api/collectors/:id/activity - Get collector activity
 */
router.get('/:id/activity', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, page = 1 } = req.query;

        const activities = await prisma.collectorActivity.findMany({
            where: { collectorId: id, tenantId: req.tenantId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        const total = await prisma.collectorActivity.count({
            where: { collectorId: id }
        });

        res.json({
            activities,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Error fetching activity' });
    }
});

/**
 * POST /api/collectors/activity - Log collector activity (from collector app)
 */
router.post('/activity', async (req, res) => {
    try {
        const { action, clientId, loanId, receiptId, details, location } = req.body;
        const collectorId = req.user?.collectorId;

        if (!collectorId) {
            return res.status(401).json({ error: 'No collector session' });
        }

        const activity = await prisma.collectorActivity.create({
            data: {
                collectorId,
                tenantId: req.tenantId,
                action,
                clientId,
                loanId,
                receiptId,
                details,
                location,
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent']
            }
        });

        res.json({ success: true, activity });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Error logging activity' });
    }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * POST /api/collectors/:id/assign-clients - Bulk assign clients
 */
router.post('/:id/assign-clients', async (req, res) => {
    try {
        const { id } = req.params;
        const { clientIds } = req.body;

        if (!Array.isArray(clientIds)) {
            return res.status(400).json({ error: 'clientIds debe ser un array' });
        }

        await prisma.client.updateMany({
            where: {
                id: { in: clientIds },
                tenantId: req.tenantId
            },
            data: { collectorId: id }
        });

        res.json({ success: true, assignedCount: clientIds.length });
    } catch (error) {
        console.error('Error assigning clients:', error);
        res.status(500).json({ error: 'Error asignando clientes' });
    }
});

/**
 * POST /api/collectors/:id/unassign-clients - Bulk unassign clients
 */
router.post('/:id/unassign-clients', async (req, res) => {
    try {
        const { id } = req.params;
        const { clientIds } = req.body;

        const where = { tenantId: req.tenantId, collectorId: id };
        if (Array.isArray(clientIds) && clientIds.length > 0) {
            where.id = { in: clientIds };
        }

        await prisma.client.updateMany({
            where,
            data: { collectorId: null }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error unassigning clients:', error);
        res.status(500).json({ error: 'Error desasignando clientes' });
    }
});

// ============================================
// COLLECTOR PORTAL ENDPOINTS (Public with collector token)
// ============================================

/**
 * GET /api/collectors/:id/clients - Get collector's assigned clients with loans
 * Works with collector token (from collector portal)
 */
router.get('/:id/clients', async (req, res) => {
    try {
        const { id } = req.params;

        // Get tenantId from either user token or collector token
        const tenantId = req.tenantId || req.user?.tenantId;

        if (!tenantId) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        // Verify collector belongs to tenant and matches id
        const collector = await prisma.collector.findFirst({
            where: { id, tenantId }
        });

        if (!collector) {
            return res.status(404).json({ error: 'Cobrador no encontrado' });
        }

        // Get clients assigned to this collector with their active loans
        const clients = await prisma.client.findMany({
            where: {
                collectorId: id,
                tenantId
            },
            include: {
                loans: {
                    where: {
                        status: { in: ['ACTIVE', 'PENDING'] }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        res.json(clients);
    } catch (error) {
        console.error('Error fetching collector clients:', error);
        res.status(500).json({ error: 'Error fetching clients' });
    }
});

/**
 * GET /api/collectors/:id/pending - Get pending collections for today
 */
router.get('/:id/pending', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId || req.user?.tenantId;
        const today = new Date().toISOString().split('T')[0];

        // Get all clients for this collector
        const clients = await prisma.client.findMany({
            where: { collectorId: id, tenantId },
            include: {
                loans: {
                    where: { status: 'ACTIVE' }
                }
            }
        });

        // Build pending collections list
        const pendingCollections = [];

        for (const client of clients) {
            for (const loan of client.loans) {
                const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
                const pendingInstallments = schedule.filter(s =>
                    s.status === 'PENDING' &&
                    s.date?.split('T')[0] <= today
                );

                for (const installment of pendingInstallments) {
                    pendingCollections.push({
                        clientId: client.id,
                        clientName: client.name,
                        clientPhone: client.phone,
                        clientAddress: client.address,
                        loanId: loan.id,
                        installmentNumber: installment.number,
                        installmentId: installment.id,
                        dueDate: installment.date,
                        amount: installment.payment,
                        isOverdue: installment.date?.split('T')[0] < today
                    });
                }
            }
        }

        res.json({
            collectorId: id,
            date: today,
            pendingCount: pendingCollections.length,
            totalAmount: pendingCollections.reduce((sum, p) => sum + (p.amount || 0), 0),
            collections: pendingCollections
        });
    } catch (error) {
        console.error('Error fetching pending collections:', error);
        res.status(500).json({ error: 'Error fetching pending' });
    }
});

module.exports = router;
