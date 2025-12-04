
import { calculateSchedule } from '../utils/amortization';

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
    const { withPenalty = false, penaltyAmountOverride = null } = options;
    const installment = loan?.schedule.find(i => i.id === installmentId);

    if (!loan || !installment) return null;

    const previousTotalPaid = loan.totalPaid || 0;
    const basePayment = installment.payment;
    const penaltyRate = withPenalty ? (systemSettings.defaultPenaltyRate || 0) : 0;
    const autoPenalty = withPenalty ? (basePayment * penaltyRate) / 100 : 0;
    const penaltyAmount = withPenalty
        ? (penaltyAmountOverride !== null ? penaltyAmountOverride : autoPenalty)
        : 0;
    const paymentAmount = basePayment + penaltyAmount;
    const newTotalPaid = previousTotalPaid + paymentAmount;
    const loanAmount = parseFloat(loan.amount || 0);
    const remainingBalance = Math.max(loanAmount - newTotalPaid, 0);

    const updatedSchedule = loan.schedule.map(inst =>
        inst.id === installmentId
            ? { ...inst, status: 'PAID', paidAmount: inst.payment, paidDate: new Date().toISOString() }
            : inst
    );

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
        }
    };
};
