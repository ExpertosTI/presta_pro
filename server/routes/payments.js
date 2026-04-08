const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');
const emailService = require('../services/emailService');

// Haversine distance in meters between two GPS points
function getDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DISTANCE_ALERT_THRESHOLD = 500; // metros

// GET /api/payments/location-alerts - Obtener pagos con alertas de ubicación
router.get('/location-alerts', async (req, res) => {
    try {
        const receipts = await prisma.receipt.findMany({
            where: {
                tenantId: req.user.tenantId,
                metadata: { path: ['locationAlert'], equals: true }
            },
            orderBy: { date: 'desc' },
            take: 50,
            include: { client: { select: { name: true } } }
        });
        res.json(receipts);
    } catch (error) {
        console.error('Error fetching location alerts:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// GET /api/payments - Obtener historial de pagos
router.get('/', async (req, res) => {
    try {
        const receipts = await prisma.receipt.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { date: 'desc' },
            take: 100 // Limitar a los últimos 100 para no sobrecargar
        });
        res.json(receipts);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Error al obtener pagos' });
    }
});

// POST /api/payments - Registrar un pago
router.post('/', async (req, res) => {
    try {
        // Frontend sends: loanId, installmentId (or installmentNumber), amount, penaltyAmount, customAmount, collectorLat, collectorLng
        const { loanId, installmentId, installmentNumber, amount, penaltyAmount, customAmount, date, notes, isPartialPayment, collectorLat, collectorLng } = req.body;

        if (!loanId) {
            return res.status(400).json({ error: 'Se requiere ID de préstamo' });
        }

        // Verificar préstamo
        const loan = await prisma.loan.findFirst({
            where: { id: loanId, tenantId: req.user.tenantId },
            include: { installments: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Encontrar la cuota a pagar
        let installment = null;
        if (installmentId) {
            installment = loan.installments.find(i => i.id === installmentId);
        } else if (installmentNumber) {
            installment = loan.installments.find(i => i.number === installmentNumber);
        }

        const finalAmount = parseFloat(customAmount || amount || installment?.payment || 0);
        const finalPenalty = parseFloat(penaltyAmount || 0);

        // Build GPS metadata
        let metadata = null;
        let locationAlert = false;
        let distanceFromClient = null;

        if (collectorLat != null && collectorLng != null) {
            metadata = {
                collectorLat: parseFloat(collectorLat),
                collectorLng: parseFloat(collectorLng),
                collectorId: req.user.userId
            };

            // Check distance from client's saved location
            const clientRecord = await prisma.client.findUnique({ where: { id: loan.clientId } });
            if (clientRecord?.lat != null && clientRecord?.lng != null) {
                distanceFromClient = Math.round(getDistanceMeters(
                    parseFloat(collectorLat), parseFloat(collectorLng),
                    clientRecord.lat, clientRecord.lng
                ));
                metadata.distanceFromClient = distanceFromClient;
                metadata.clientLat = clientRecord.lat;
                metadata.clientLng = clientRecord.lng;

                if (distanceFromClient > DISTANCE_ALERT_THRESHOLD) {
                    locationAlert = true;
                    metadata.locationAlert = true;
                    metadata.alertThreshold = DISTANCE_ALERT_THRESHOLD;
                }
            }
        }

        // Crear recibo
        const newReceipt = await prisma.receipt.create({
            data: {
                tenantId: req.user.tenantId,
                loanId,
                clientId: loan.clientId,
                amount: finalAmount,
                penaltyAmount: finalPenalty,
                installmentNumber: installment?.number || installmentNumber || 0,
                isPartialPayment: isPartialPayment || false,
                metadata,
                date: date ? new Date(date) : new Date()
            }
        });

        // Create distance alert notification if payment was far from client
        if (locationAlert) {
            try {
                const clientRecord = await prisma.client.findUnique({ where: { id: loan.clientId } });
                await prisma.notification.create({
                    data: {
                        tenantId: req.user.tenantId,
                        type: 'LOCATION_ALERT',
                        title: '⚠️ Cobro fuera de zona',
                        message: `Pago de RD$${finalAmount.toLocaleString()} registrado a ${distanceFromClient}m del cliente ${clientRecord?.name || ''}. Umbral: ${DISTANCE_ALERT_THRESHOLD}m.`,
                        data: {
                            receiptId: newReceipt.id,
                            loanId,
                            clientId: loan.clientId,
                            clientName: clientRecord?.name,
                            collectorId: req.user.userId,
                            distance: distanceFromClient,
                            threshold: DISTANCE_ALERT_THRESHOLD
                        }
                    }
                });
            } catch (alertErr) {
                console.error('Error creating location alert:', alertErr.message);
            }
        }

        // Actualizar la cuota como pagada si se encontró
        if (installment) {
            await prisma.loanInstallment.update({
                where: { id: installment.id },
                data: {
                    status: 'PAID',
                    paidAmount: finalAmount + finalPenalty,
                    paidDate: new Date()
                }
            });
        }

        // Actualizar totalPaid del préstamo
        const newTotalPaid = (loan.totalPaid || 0) + finalAmount + finalPenalty;
        await prisma.loan.update({
            where: { id: loanId },
            data: { totalPaid: newTotalPaid }
        });

        // Verificar si todas las cuotas están pagadas para cerrar el préstamo
        const updatedInstallments = await prisma.loanInstallment.findMany({
            where: { loanId }
        });
        const allPaid = updatedInstallments.every(i => i.status === 'PAID');
        if (allPaid) {
            await prisma.loan.update({
                where: { id: loanId },
                data: { status: 'COMPLETED' }
            });
        }

        // Log audit
        logAudit({
            action: AUDIT_ACTIONS.PAYMENT_REGISTERED,
            resource: 'payment',
            resourceId: newReceipt.id,
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            details: { loanId, amount: finalAmount, penaltyAmount: finalPenalty, installmentId: installment?.id },
            ipAddress: req.ip
        });

        // Enviar recibo por correo si el cliente tiene email
        try {
            const client = await prisma.client.findUnique({ where: { id: loan.clientId } });
            const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

            if (client?.email) {
                const pendingInstallments = updatedInstallments.filter(i => i.status !== 'PAID').length;
                const totalBalance = updatedInstallments
                    .filter(i => i.status !== 'PAID')
                    .reduce((sum, i) => sum + (i.payment || 0), 0);

                await emailService.sendPaymentConfirmation({
                    to: client.email,
                    tenantName: tenant?.name || 'Presta Pro',
                    clientName: client.name,
                    amount: finalAmount + finalPenalty,
                    installmentNumber: installment?.number || installmentNumber || 0,
                    date: newReceipt.date,
                    receiptId: newReceipt.id,
                    pendingInstallments,
                    balance: totalBalance
                });
            }
        } catch (emailError) {
            console.error('Error sending receipt email:', emailError.message);
            // No fallar el pago por error de email
        }

        res.status(201).json(newReceipt);
    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

module.exports = router;
