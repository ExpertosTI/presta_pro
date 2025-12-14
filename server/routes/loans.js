const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogger');
const notify = require('../services/notificationHelper');

// --- Helper: Calculate amortization schedule ---
// amortizationType: 'FLAT' (default, simple interest), 'FRENCH' (compound on balance), 'INTEREST_ONLY'
function calculateSchedule(amount, rate, term, frequency, startDate, amortizationType = 'FLAT') {
    const schedule = [];
    const principalAmount = parseFloat(amount) || 0;
    let balance = principalAmount;
    const ratePercent = (parseFloat(rate) || 0) / 100;
    const totalTerms = parseInt(term, 10) || 0;

    let daysPerPeriod = 30;

    switch (frequency) {
        case 'Diario': daysPerPeriod = 1; break;
        case 'Semanal': daysPerPeriod = 7; break;
        case 'Quincenal': daysPerPeriod = 15; break;
        case 'Mensual': daysPerPeriod = 30; break;
        default: daysPerPeriod = 30;
    }

    if (!principalAmount || (!totalTerms && amortizationType !== 'OPEN')) return [];

    let currentDate = new Date(startDate);

    // =============================================
    // FLAT (Simple Interest) - Most common in RD
    // Total = Principal * (1 + rate)
    // Example: 10,000 at 20% = 12,000 total
    // =============================================
    if (amortizationType === 'FLAT') {
        const totalInterest = principalAmount * ratePercent;
        const totalAmount = principalAmount + totalInterest;
        const regularPayment = parseFloat((totalAmount / totalTerms).toFixed(2));
        const interestPerPayment = parseFloat((totalInterest / totalTerms).toFixed(2));
        const principalPerPayment = parseFloat((principalAmount / totalTerms).toFixed(2));

        let remainingBalance = principalAmount;
        let totalPaid = 0;

        for (let i = 1; i <= totalTerms; i++) {
            currentDate.setDate(currentDate.getDate() + daysPerPeriod);

            // Last payment adjusts for rounding differences
            let payment = regularPayment;
            let principal = principalPerPayment;
            let interest = interestPerPayment;

            if (i === totalTerms) {
                // Adjust last payment to match exact total
                const remaining = totalAmount - totalPaid;
                payment = parseFloat(remaining.toFixed(2));
                principal = remainingBalance;
                interest = parseFloat((payment - principal).toFixed(2));
            }

            remainingBalance = parseFloat((remainingBalance - principal).toFixed(2));
            if (remainingBalance < 0) remainingBalance = 0;
            totalPaid += payment;

            schedule.push({
                number: i,
                date: new Date(currentDate),
                payment,
                interest,
                principal,
                balance: remainingBalance,
                status: 'PENDING'
            });
        }
        return schedule;
    }

    // =============================================
    // INTEREST_ONLY - Pay only interest each period
    // Principal paid at end or never
    // =============================================
    if (amortizationType === 'INTEREST_ONLY') {
        const periodsPerYear = frequency === 'Diario' ? 365 : frequency === 'Semanal' ? 52 : frequency === 'Quincenal' ? 24 : 12;
        const ratePerPeriod = ratePercent / periodsPerYear;
        const interestPayment = parseFloat((principalAmount * ratePerPeriod).toFixed(2));

        for (let i = 1; i <= totalTerms; i++) {
            currentDate.setDate(currentDate.getDate() + daysPerPeriod);
            schedule.push({
                number: i,
                date: new Date(currentDate),
                payment: interestPayment,
                interest: interestPayment,
                principal: 0,
                balance: principalAmount,
                status: 'PENDING'
            });
        }
        return schedule;
    }

    // =============================================
    // FRENCH - Compound interest on decreasing balance
    // Traditional amortization (banks use this)
    // =============================================
    const periodsPerYear = frequency === 'Diario' ? 365 : frequency === 'Semanal' ? 52 : frequency === 'Quincenal' ? 24 : 12;
    const ratePerPeriod = ratePercent / periodsPerYear;
    let pmt = 0;

    if (ratePerPeriod === 0) {
        pmt = principalAmount / totalTerms;
    } else {
        pmt = (principalAmount * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -totalTerms));
    }

    pmt = parseFloat(pmt.toFixed(2));

    for (let i = 1; i <= totalTerms; i++) {
        const rawInterest = balance * ratePerPeriod;
        const interest = parseFloat(rawInterest.toFixed(2));
        let principal = parseFloat((pmt - interest).toFixed(2));

        if (i === totalTerms) {
            principal = balance;
            pmt = principal + interest;
        }

        balance = parseFloat((balance - principal).toFixed(2));
        if (balance < 0) balance = 0;

        currentDate.setDate(currentDate.getDate() + daysPerPeriod);

        schedule.push({
            number: i,
            date: new Date(currentDate),
            payment: parseFloat(pmt.toFixed(2)),
            interest,
            principal,
            balance,
            status: 'PENDING'
        });
    }

    return schedule;
}

// --- Helper: Map loan to response format ---
function mapLoanToResponse(loanWithRelations) {
    const { installments, client, freePayments, ...loan } = loanWithRelations;

    // Para préstamos abiertos, calcular el saldo actual
    let currentBalance = loan.amount + (loan.closingCosts || 0);
    if (loan.loanType === 'OPEN' && freePayments) {
        const totalPaidToPrincipal = freePayments.reduce((sum, p) => sum + (p.toPrincipal || 0), 0);
        currentBalance = currentBalance - totalPaidToPrincipal;
    }

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
        // Campos para préstamos abiertos
        loanType: loan.loanType || 'FIXED',
        interestAccrued: loan.interestAccrued || 0,
        dailyRate: loan.dailyRate || null,
        lastInterestCalc: loan.lastInterestCalc || null,
        currentBalance: currentBalance,
        closingCosts: loan.closingCosts || 0,
        // Historial de pagos libres (para préstamos abiertos)
        freePayments: (freePayments || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => ({
            id: p.id,
            amount: p.amount,
            toPrincipal: p.toPrincipal,
            toInterest: p.toInterest,
            balanceAfter: p.balanceAfter,
            date: p.date,
            notes: p.notes
        })),
        // Cuotas (para préstamos fijos)
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
        // By default, hide archived loans unless includeArchived=true
        const includeArchived = req.query.includeArchived === 'true';

        const whereClause = {
            tenantId: req.user.tenantId
        };

        // Only filter if not including archived
        if (!includeArchived) {
            // Show loans where archived is NOT true (includes false, null, undefined)
            whereClause.archived = { not: true };
        }

        const loans = await prisma.loan.findMany({
            where: whereClause,
            include: {
                installments: true,
                client: true,
                freePayments: true
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
        const { clientId, amount, rate, term, frequency, startDate, schedule: providedSchedule, closingCosts, amortizationType, loanType, dailyRate } = req.body;

        // Para préstamos abiertos, term no es obligatorio
        const isOpenLoan = loanType === 'OPEN';

        if (!clientId || !amount || !rate || !startDate) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (clientId, amount, rate, startDate)' });
        }

        if (!isOpenLoan && (!term || !frequency)) {
            return res.status(400).json({ error: 'Para préstamos con cuotas fijas se requiere term y frequency' });
        }

        // Verificar que el cliente existe y pertenece al tenant
        const client = await prisma.client.findFirst({
            where: { id: clientId, tenantId: req.user.tenantId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado o no pertenece a este tenant' });
        }

        // === SUBSCRIPTION LOAN LIMIT CHECK ===
        // SUPER_ADMIN users (owners) bypass all limits
        const isSuperAdmin = req.user?.role?.toUpperCase() === 'SUPER_ADMIN';

        if (!isSuperAdmin) {
            const subscription = await prisma.subscription.findUnique({
                where: { tenantId: req.user.tenantId }
            });

            if (subscription) {
                const limits = typeof subscription.limits === 'string'
                    ? JSON.parse(subscription.limits)
                    : subscription.limits;

                if (limits?.maxLoans && limits.maxLoans > 0) {
                    const currentLoanCount = await prisma.loan.count({
                        where: { tenantId: req.user.tenantId, status: 'ACTIVE' }
                    });

                    if (currentLoanCount >= limits.maxLoans) {
                        return res.status(403).json({
                            error: `Has alcanzado el límite de ${limits.maxLoans} préstamos activos de tu plan. Actualiza tu suscripción para crear más.`,
                            limitReached: true,
                            currentCount: currentLoanCount,
                            maxAllowed: limits.maxLoans
                        });
                    }
                }
            }
        }
        // === END LOAN LIMIT CHECK ===

        // Calculate total (amount + closingCosts) for schedule calculation
        const parsedAmount = parseFloat(amount);
        const parsedClosingCosts = parseFloat(closingCosts) || 0;
        const totalForSchedule = parsedAmount + parsedClosingCosts;

        // Calculate schedule if not provided - use totalForSchedule
        const schedule = providedSchedule && Array.isArray(providedSchedule) && providedSchedule.length > 0
            ? providedSchedule
            : calculateSchedule(totalForSchedule, rate, term, frequency, startDate, amortizationType);

        const totalInterest = schedule.reduce((acc, item) => acc + (item.interest || 0), 0);

        // Build loan data
        let loanData;

        if (isOpenLoan) {
            // Préstamo abierto - sin cuotas fijas
            const parsedDailyRate = parseFloat(dailyRate) || (parseFloat(rate) / 365); // Tasa diaria
            loanData = {
                amount: parsedAmount,
                rate: parseFloat(rate),
                term: 0, // Sin término fijo
                frequency: 'Libre',
                startDate: new Date(startDate),
                status: 'ACTIVE',
                totalInterest: 0,
                totalPaid: 0,
                loanType: 'OPEN',
                dailyRate: parsedDailyRate,
                interestAccrued: 0,
                lastInterestCalc: new Date(startDate),
                tenantId: req.user.tenantId,
                clientId,
                closingCosts: parsedClosingCosts
            };
        } else {
            // Préstamo tradicional con cuotas fijas
            loanData = {
                amount: parsedAmount,
                rate: parseFloat(rate),
                term: parseInt(term),
                frequency,
                startDate: new Date(startDate),
                status: 'ACTIVE',
                totalInterest,
                totalPaid: 0,
                loanType: 'FIXED',
                tenantId: req.user.tenantId,
                clientId,
                closingCosts: parsedClosingCosts,
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
        }

        const newLoan = await prisma.loan.create({
            data: loanData,
            include: {
                installments: true,
                client: true,
                freePayments: true
            }
        });

        res.status(201).json(mapLoanToResponse(newLoan));

        // Send push notification for new loan
        if (newLoan.client) {
            notify.notifyLoanCreated({
                tenantId: req.user.tenantId,
                clientName: newLoan.client.name,
                amount: parsedAmount
            }).catch(err => console.error('[LOAN] Notify error:', err.message));
        }
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

        // Send push notification for payment
        notify.notifyPaymentReceived({
            tenantId: req.user.tenantId,
            clientName: loan.client?.name || 'Cliente',
            amount: paymentAmount,
            loanId: id
        }).catch(err => console.error('[PAYMENT] Notify error:', err.message));

        res.json({
            loan: mapLoanToResponse(result.updatedLoan),
            receipt: result.receipt,
        });
    } catch (error) {
        console.error('Error registering payment:', error);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

// POST /api/loans/:id/free-payment - Registrar abono libre (préstamos abiertos)
router.post('/:id/free-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, notes, collectorId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
        }

        // Obtener préstamo
        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId },
            include: { freePayments: true, client: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        if (loan.loanType !== 'OPEN') {
            return res.status(400).json({ error: 'Este endpoint solo es para préstamos abiertos' });
        }

        // Calcular interés acumulado desde última fecha de cálculo
        const lastCalc = loan.lastInterestCalc || loan.startDate;
        const now = new Date();
        const daysSinceLastCalc = Math.floor((now - new Date(lastCalc)) / (1000 * 60 * 60 * 24));

        // Calcular saldo actual (principal - pagos a capital)
        const totalPaidToPrincipal = loan.freePayments.reduce((sum, p) => sum + (p.toPrincipal || 0), 0);
        const currentPrincipal = loan.amount + (loan.closingCosts || 0) - totalPaidToPrincipal;

        // Calcular nuevo interés acumulado
        const dailyRate = loan.dailyRate || (loan.rate / 365 / 100);
        const newInterest = currentPrincipal * dailyRate * daysSinceLastCalc;
        const totalInterestAccrued = (loan.interestAccrued || 0) + newInterest;

        // Aplicar pago: primero a interés, luego a capital
        const paymentAmount = parseFloat(amount);
        let toInterest = Math.min(paymentAmount, totalInterestAccrued);
        let toPrincipal = paymentAmount - toInterest;

        // Si queda más del capital disponible, limitar
        if (toPrincipal > currentPrincipal) {
            toPrincipal = currentPrincipal;
        }

        const balanceAfter = currentPrincipal - toPrincipal;
        const remainingInterest = totalInterestAccrued - toInterest;

        // Crear pago libre
        const freePayment = await prisma.freePayment.create({
            data: {
                loanId: id,
                amount: paymentAmount,
                toPrincipal,
                toInterest,
                balanceAfter,
                date: now,
                collectorId: collectorId || null,
                notes: notes || null,
                tenantId: req.user.tenantId
            }
        });

        // Actualizar préstamo
        const newStatus = balanceAfter <= 0 ? 'COMPLETED' : 'ACTIVE';
        await prisma.loan.update({
            where: { id },
            data: {
                totalPaid: loan.totalPaid + paymentAmount,
                totalInterest: loan.totalInterest + toInterest,
                interestAccrued: remainingInterest,
                lastInterestCalc: now,
                status: newStatus
            }
        });

        // Obtener préstamo actualizado
        const updatedLoan = await prisma.loan.findUnique({
            where: { id },
            include: { installments: true, client: true, freePayments: true }
        });

        // Audit log
        await logAudit({
            userId: req.user.id,
            action: AUDIT_ACTIONS.LOAN_PAYMENT,
            tenantId: req.user.tenantId,
            details: {
                loanId: id,
                amount: paymentAmount,
                toPrincipal,
                toInterest,
                balanceAfter,
                type: 'FREE_PAYMENT'
            },
            ipAddress: req.ip
        });

        // Send push notification for free payment
        notify.notifyPaymentReceived({
            tenantId: req.user.tenantId,
            clientName: loan.client?.name || 'Cliente',
            amount: paymentAmount,
            loanId: id
        }).catch(err => console.error('[FREE_PAYMENT] Notify error:', err.message));

        res.json({
            success: true,
            payment: freePayment,
            loan: mapLoanToResponse(updatedLoan),
            summary: {
                paidToInterest: toInterest,
                paidToPrincipal: toPrincipal,
                remainingBalance: balanceAfter,
                remainingInterest: remainingInterest,
                loanStatus: newStatus
            }
        });

    } catch (error) {
        console.error('Error registering free payment:', error);
        res.status(500).json({ error: 'Error al registrar abono' });
    }
});

// GET /api/loans/:id/free-payments - Obtener historial de abonos libres
router.get('/:id/free-payments', async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const payments = await prisma.freePayment.findMany({
            where: { loanId: id },
            orderBy: { date: 'desc' }
        });

        res.json(payments);
    } catch (error) {
        console.error('Error fetching free payments:', error);
        res.status(500).json({ error: 'Error al obtener abonos' });
    }
});

// ============================================
// LOAN STATUS MANAGEMENT
// ============================================

// POST /api/loans/:id/cancel - Cancelar préstamo
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId },
            include: { installments: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Check if loan has any paid installments
        const hasPaidInstallments = loan.installments.some(i => i.status === 'PAID');
        if (hasPaidInstallments) {
            return res.status(400).json({
                error: 'No se puede cancelar un préstamo con pagos registrados. Use "Archivar" en su lugar.'
            });
        }

        const updated = await prisma.loan.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: reason || 'Cancelado por usuario'
            },
            include: { installments: true, client: true }
        });

        await logAudit({
            userId: req.user.id,
            action: AUDIT_ACTIONS.LOAN_DELETED || 'LOAN_CANCELLED',
            tenantId: req.user.tenantId,
            details: { loanId: id, reason },
            ipAddress: req.ip
        });

        res.json({ success: true, loan: mapLoanToResponse(updated) });
    } catch (error) {
        console.error('Error cancelling loan:', error);
        res.status(500).json({ error: 'Error al cancelar préstamo' });
    }
});

// POST /api/loans/:id/archive - Archivar préstamo (ocultar de vista principal)
router.post('/:id/archive', async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const updated = await prisma.loan.update({
            where: { id },
            data: {
                archived: true,
                archivedAt: new Date()
            },
            include: { installments: true, client: true }
        });

        await logAudit({
            userId: req.user.id,
            action: 'LOAN_ARCHIVED',
            tenantId: req.user.tenantId,
            details: { loanId: id },
            ipAddress: req.ip
        });

        res.json({ success: true, loan: mapLoanToResponse(updated) });
    } catch (error) {
        console.error('Error archiving loan:', error);
        res.status(500).json({ error: 'Error al archivar préstamo' });
    }
});

// POST /api/loans/:id/unarchive - Desarchivar préstamo
router.post('/:id/unarchive', async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        const updated = await prisma.loan.update({
            where: { id },
            data: {
                archived: false,
                archivedAt: null
            },
            include: { installments: true, client: true }
        });

        res.json({ success: true, loan: mapLoanToResponse(updated) });
    } catch (error) {
        console.error('Error unarchiving loan:', error);
        res.status(500).json({ error: 'Error al desarchivar préstamo' });
    }
});

// DELETE /api/loans/:id - Eliminar préstamo permanentemente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await prisma.loan.findFirst({
            where: { id, tenantId: req.user.tenantId },
            include: { installments: true }
        });

        if (!loan) {
            return res.status(404).json({ error: 'Préstamo no encontrado' });
        }

        // Only allow delete if no payments were made
        const hasPaidInstallments = loan.installments.some(i => i.status === 'PAID');
        if (hasPaidInstallments) {
            return res.status(400).json({
                error: 'No se puede eliminar un préstamo con pagos registrados. Use "Archivar" en su lugar.'
            });
        }

        // Delete installments first, then loan
        await prisma.$transaction([
            prisma.loanInstallment.deleteMany({ where: { loanId: id } }),
            prisma.freePayment.deleteMany({ where: { loanId: id } }),
            prisma.loan.delete({ where: { id } })
        ]);

        await logAudit({
            userId: req.user.id,
            action: AUDIT_ACTIONS.LOAN_DELETED || 'LOAN_DELETED',
            tenantId: req.user.tenantId,
            details: { loanId: id, amount: loan.amount, clientId: loan.clientId },
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Préstamo eliminado' });
    } catch (error) {
        console.error('Error deleting loan:', error);
        res.status(500).json({ error: 'Error al eliminar préstamo' });
    }
});

module.exports = router;
