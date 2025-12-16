
import { calculateSchedule } from '../shared/utils/amortization';

export const createLoanLogic = (loanData) => {
    const schedule = calculateSchedule(
        loanData.amount,
        loanData.rate,
        loanData.term,
        loanData.frequency,
        loanData.startDate
    );

    return {
        ...loanData,
        schedule,
        totalInterest: schedule.reduce((acc, item) => acc + item.interest, 0),
        totalPaid: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
    };
};

export const registerPaymentLogic = (loan, installmentId, options = {}, systemSettings = {}) => {
    const { withPenalty = false, penaltyAmount: penaltyAmountOverride = null, customAmount = null } = options;
    const installment = loan?.schedule.find(i => i.id === installmentId);

    if (!loan || !installment) return null;

    const previousTotalPaid = loan.totalPaid || 0;
    const fullPayment = installment.payment;

    // Use customAmount if provided (for partial payments / abonos)
    const basePayment = customAmount !== null && customAmount !== undefined
        ? parseFloat(customAmount)
        : fullPayment;

    const isPartialPayment = basePayment < fullPayment;
    const remainingOnInstallment = isPartialPayment ? (fullPayment - basePayment) : 0;

    // Penalty calculation
    const penaltyRate = withPenalty ? (systemSettings.defaultPenaltyRate || 0) : 0;
    const autoPenalty = withPenalty ? (fullPayment * penaltyRate) / 100 : 0;
    const penaltyAmount = withPenalty
        ? (penaltyAmountOverride !== null ? penaltyAmountOverride : autoPenalty)
        : 0;

    const paymentAmount = basePayment + penaltyAmount;
    const newTotalPaid = previousTotalPaid + paymentAmount;
    const loanAmount = parseFloat(loan.amount || 0);
    const remainingBalance = Math.max(loanAmount - newTotalPaid, 0);

    // Update installment status
    const updatedSchedule = loan.schedule.map(inst => {
        if (inst.id === installmentId) {
            const previousPaid = parseFloat(inst.paidAmount || 0);
            const newPaidAmount = previousPaid + basePayment;
            const installmentFullyPaid = newPaidAmount >= inst.payment;

            return {
                ...inst,
                status: installmentFullyPaid ? 'PAID' : 'PARTIAL',
                paidAmount: newPaidAmount,
                paidDate: new Date().toISOString()
            };
        }
        return inst;
    });

    const allPaid = updatedSchedule.every(i => i.status === 'PAID');

    return {
        updatedLoan: {
            ...loan,
            schedule: updatedSchedule,
            totalPaid: newTotalPaid,
            status: allPaid ? 'PAID' : 'ACTIVE',
        },
        receiptData: {
            amount: basePayment,
            installmentNumber: installment.number,
            installmentDate: installment.date,
            loanAmount,
            totalPaidAfter: newTotalPaid,
            remainingBalance,
            penaltyAmount,
            withPenalty,
            isPartialPayment,
            remainingOnInstallment,
            fullInstallmentAmount: fullPayment,
        }
    };
};
