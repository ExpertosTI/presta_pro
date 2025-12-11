const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');

// --- Helper: Calculate amortization schedule ---
function calculateSchedule(amount, rate, term, frequency, startDate) {
    const schedule = [];
    const principalAmount = parseFloat(amount) || 0;
    let balance = principalAmount;
    const annualRate = (parseFloat(rate) || 0) / 100;
    const totalTerms = parseInt(term, 10) || 0;

    let periodsPerYear = 12;
    let daysPerPeriod = 30;

    switch (frequency) {
        case 'Diario':
            periodsPerYear = 365;
            daysPerPeriod = 1;
            break;
        case 'Semanal':
            periodsPerYear = 52;
            daysPerPeriod = 7;
            break;
        case 'Quincenal':
            periodsPerYear = 24;
            daysPerPeriod = 15;
            break;
        case 'Mensual':
            periodsPerYear = 12;
            daysPerPeriod = 30;
            break;
        default:
            periodsPerYear = 12;
    }

    if (!principalAmount || !totalTerms) return [];

    const ratePerPeriod = annualRate / periodsPerYear;
    let pmt = 0;

    if (ratePerPeriod === 0) {
        pmt = principalAmount / totalTerms;
    } else {
        pmt = (principalAmount * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -totalTerms));
    }

    pmt = parseFloat(pmt.toFixed(2));

    let currentDate = new Date(startDate);

    for (let i = 1; i <= totalTerms; i++) {
        const rawInterest = balance * ratePerPeriod;
        const interest = parseFloat(rawInterest.toFixed(2));
        const principal = parseFloat((pmt - interest).toFixed(2));
        balance = parseFloat((balance - principal).toFixed(2));
        if (balance < 0) balance = 0;

        currentDate.setDate(currentDate.getDate() + daysPerPeriod);

        schedule.push({
            number: i,
            date: new Date(currentDate),
            payment: pmt,
            interest,
            principal,
            balance,
        });
    }

    return schedule;
}

// --- Helper: Map loan to response format ---
function mapLoanToResponse(loanWithRelations) {
    const { installments, client, ...loan } = loanWithRelations;
    return {
        id: loan.id,
        clientId: loan.clientId,
        clientName: client ? client.name : undefined,
        amount: loan.amount,
        rate: loan.rate,
        term: loan.term,
        frequency: loan.frequency,
        status: loan.status,
        totalInterest: loan.totalInterest,
        totalPaid: loan.totalPaid,
        startDate: loan.startDate,
        createdAt: loan.createdAt,
        schedule: (installments || [])
            .sort((a, b) => a.number - b.number)
            .map((inst) => ({
                id: inst.id,
                number: inst.number,
                date: inst.date instanceof Date ? inst.date.toISOString().split('T')[0] : inst.date,
                payment: inst.payment,
                interest: inst.interest,
                principal: inst.principal,
                balance: inst.balance,
                status: inst.status,
                paidAmount: inst.paidAmount ?? 0,
                paidDate: inst.paidDate ? inst.paidDate.toISOString() : null,
            })),
    };
}

// GET /api/loans
router.get('/', async (req, res) => {
    try {
        const loans = await prisma.loan.findMany({
            where: { tenantId: req.user.tenantId },
            include: {
                installments: true,
                client: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(loans.map(mapLoanToResponse));
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Error al obtener préstamos' });
    }
});

// POST /api/loans - Crear préstamo
router.post('/', async (req, res) => {
    try {
        const { clientId, amount, rate, term, frequency, startDate, schedule: providedSchedule, closingCosts } = req.body;

        if (!clientId || !amount || !rate || !term || !frequency || !startDate) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (clientId, amount, rate, term, frequency, startDate)' });
        }

        // Verificar que el cliente existe y pertenece al tenant
        const client = await prisma.client.findFirst({
            where: { id: clientId, tenantId: req.user.tenantId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado o no pertenece a este tenant' });
        }

        // Calculate total (amount + closingCosts) for schedule calculation
        const parsedAmount = parseFloat(amount);
        const parsedClosingCosts = parseFloat(closingCosts) || 0;
        const totalForSchedule = parsedAmount + parsedClosingCosts;

        // Calculate schedule if not provided - use totalForSchedule
        const schedule = providedSchedule && Array.isArray(providedSchedule) && providedSchedule.length > 0
            ? providedSchedule
            : calculateSchedule(totalForSchedule, rate, term, frequency, startDate);

        const totalInterest = schedule.reduce((acc, item) => acc + (item.interest || 0), 0);

        // Build loan data - closingCosts will be added after migration runs
        const loanData = {
            amount: parsedAmount,
            rate: parseFloat(rate),
            term: parseInt(term),
            frequency,
            startDate: new Date(startDate),
            status: 'ACTIVE',
            totalInterest,
            totalPaid: 0,
            tenantId: req.user.tenantId,
            clientId,
            installments: {
                create: schedule.map(inst => ({
                    number: inst.number,
                    date: new Date(inst.date),
                    payment: parseFloat(inst.payment),
                    interest: parseFloat(inst.interest),
                    principal: parseFloat(inst.principal),
                    balance: parseFloat(inst.balance),
                    status: inst.status || 'PENDING'
                }))
            }
        };

        // Add closingCosts only if > 0 (comment out until migration runs)
        // if (parsedClosingCosts > 0) loanData.closingCosts = parsedClosingCosts;

        const newLoan = await prisma.loan.create({
            data: loanData,
            include: {
                installments: true,
                client: true
            }
        });

        res.status(201).json(mapLoanToResponse(newLoan));
    } catch (error) {
        console.error('Error creating loan:', error.message);
        console.error('Error details:', error.code, error.meta);
        res.status(500).json({
            error: 'Error al crear préstamo',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// PUT /api/loans/:id - Actualizar préstamo completo (con recálculo de schedule si aplica)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, rate, term, frequency, startDate, status, totalPaid, schedule } = req.body;

        // Verificar ownership
        const existingLoan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId },
            include: { installments: true }
        });

        if (!existingLoan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Si se están editando parámetros del préstamo (amount, rate, term, etc.)
        // Solo permitir si no tiene pagos registrados
        const hasPayments = existingLoan.installments.some(inst => inst.status === 'PAID');

        if ((amount || rate || term || frequency || startDate) && hasPayments) {
            return res.status(400).json({ error: 'No se puede editar un préstamo con pagos registrados' });
        }

        // Si se proporciona schedule o parámetros nuevos, recalcular
        if (amount && rate && term && frequency && startDate && !hasPayments) {
            // Recalcular schedule desde cero
            const newSchedule = calculateSchedule(amount, rate, term, frequency, startDate);
            const totalInterest = newSchedule.reduce((acc, item) => acc + item.interest, 0);

            // Eliminar cuotas anteriores y recrear
            const updated = await prisma.$transaction(async (tx) => {
                await tx.loanInstallment.deleteMany({ where: { loanId: id } });

                return await tx.loan.update({
                    where: { id },
                    data: {
                        amount: parseFloat(amount),
                        rate: parseFloat(rate),
                        term: parseInt(term, 10),
                        frequency,
                        startDate: new Date(startDate),
                        totalInterest,
                        totalPaid: 0,
                        status: 'ACTIVE',
                        installments: {
                            create: newSchedule.map(s => ({
                                number: s.number,
                                date: s.date,
                                payment: s.payment,
                                interest: s.interest,
                                principal: s.principal,
                                balance: s.balance,
                            })),
                        },
                    },
                    include: { installments: true, client: true },
                });
            });

            return res.json(mapLoanToResponse(updated));
        }

        // Actualización parcial (status, totalPaid, cuotas individuales)
        const updatedLoan = await prisma.loan.update({
            where: { id },
            data: {
                status: status || undefined,
                totalPaid: totalPaid !== undefined ? parseFloat(totalPaid) : undefined,
            }
        });

        // Actualizar cuotas si se envían
        if (schedule && Array.isArray(schedule)) {
            for (const inst of schedule) {
                if (inst.id) {
                    await prisma.loanInstallment.update({
                        where: { id: inst.id },
                        data: {
                            status: inst.status,
                            paidAmount: parseFloat(inst.paidAmount || 0),
                            paidDate: inst.paidDate ? new Date(inst.paidDate) : null,
                            penaltyPaid: parseFloat(inst.penaltyPaid || 0)
                        }
                    });
                }
            }
        }

        // Retornar préstamo completo actualizado
        const finalLoan = await prisma.loan.findUnique({
            where: { id },
            include: { installments: true, client: true }
        });

        res.json(mapLoanToResponse(finalLoan));
    } catch (error) {
        console.error('Error updating loan:', error);
        res.status(500).json({ error: 'Error al actualizar préstamo' });
    }
});

// POST /api/loans/:id/payments - Registrar pago de cuota
router.post('/:id/payments', async (req, res) => {
    try {
        const { id } = req.params;
        const { installmentId, withPenalty, penaltyAmount } = req.body;

        if (!installmentId) {
            return res.status(400).json({ error: 'installmentId es requerido' });
        }

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId },
            include: { installments: true, client: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const installment = loan.installments.find(inst => inst.id === installmentId);
        if (!installment) {
            return res.status(404).json({ error: 'Cuota no encontrada' });
        }
        if (installment.status === 'PAID') {
            return res.status(400).json({ error: 'Esta cuota ya está pagada' });
        }

        const baseAmount = installment.payment;
        const penalty = withPenalty ? (parseFloat(penaltyAmount || 0) || 0) : 0;
        const paymentAmount = baseAmount + penalty;

        const previousTotalPaid = loan.totalPaid || 0;
        const newTotalPaid = previousTotalPaid + paymentAmount;
        const loanAmount = loan.amount;
        const remainingBalance = Math.max(loanAmount - newTotalPaid, 0);

        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();

            await tx.loanInstallment.update({
                where: { id: installment.id },
                data: {
                    status: 'PAID',
                    paidAmount: baseAmount,
                    paidDate: now,
                },
            });

            const remainingInstallments = loan.installments.filter(inst => inst.id !== installment.id);
            const allPaid = remainingInstallments.every(inst => inst.status === 'PAID');

            const updatedLoan = await tx.loan.update({
                where: { id: loan.id },
                data: {
                    totalPaid: newTotalPaid,
                    status: allPaid ? 'PAID' : 'ACTIVE',
                },
                include: { installments: true, client: true },
            });

            const receipt = await tx.receipt.create({
                data: {
                    tenantId: req.user.tenantId,
                    loanId: loan.id,
                    clientId: loan.clientId,
                    amount: baseAmount,
                    penaltyAmount: penalty,
                    installmentNumber: installment.number,
                    installmentDate: installment.date,
                    loanAmount,
                    totalPaidAfter: newTotalPaid,
                    remainingBalance,
                    withPenalty: !!withPenalty,
                },
            });

            return { updatedLoan, receipt };
        });

        // Audit log
        logAudit({
            action: AUDIT_ACTIONS.PAYMENT_REGISTERED,
            resource: 'payment',
            resourceId: result.receipt.id,
            userId: req.user.userId,
            tenantId: req.user.tenantId,
            details: { loanId: id, amount: baseAmount, penaltyAmount: penalty, installmentId },
            ipAddress: req.ip
        });

        res.json({
            loan: mapLoanToResponse(result.updatedLoan),
            receipt: result.receipt,
        });
    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

module.exports = router;
