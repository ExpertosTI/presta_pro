const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');
const emailService = require('../services/emailService');

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
        // Frontend sends: loanId, installmentId (or installmentNumber), amount, penaltyAmount, customAmount
        const { loanId, installmentId, installmentNumber, amount, penaltyAmount, customAmount, date, notes, isPartialPayment } = req.body;

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
                date: date ? new Date(date) : new Date()
            }
        });

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
                    tenantName: tenant?.name || 'RenKredit',
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

        // Calcular saldo pendiente para incluir en respuesta
        const remainingBalance = updatedInstallments
            .filter(i => i.status !== 'PAID')
            .reduce((sum, i) => sum + (i.payment || 0), 0);

        res.status(201).json({
            receipt: {
                ...newReceipt,
                installmentNumber: installment?.number || installmentNumber || 0,
                remainingBalance,
                penalty: finalPenalty
            }
        });
    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

module.exports = router;
