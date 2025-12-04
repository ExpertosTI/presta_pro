import { generateId } from '../utils/ids';
import { calculateSchedule } from '../utils/amortization';

export function createLoanFromRequest(request) {
  const schedule = calculateSchedule(
    request.amount,
    request.rate,
    request.term,
    request.frequency,
    request.startDate,
  );

  const newLoan = {
    ...request,
    id: generateId(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    schedule,
    totalInterest: schedule.reduce((acc, item) => acc + item.interest, 0),
    totalPaid: 0,
  };

  return newLoan;
}

export function registerLoanPayment(loan, installmentId) {
  const installment = loan.schedule.find(i => i.id === installmentId);
  if (!installment) return loan;

  const updatedSchedule = loan.schedule.map(inst =>
    inst.id === installmentId
      ? { ...inst, status: 'PAID', paidAmount: inst.payment, paidDate: new Date().toISOString() }
      : inst,
  );
  const allPaid = updatedSchedule.every(i => i.status === 'PAID');

  return {
    ...loan,
    schedule: updatedSchedule,
    totalPaid: loan.totalPaid + installment.payment,
    status: allPaid ? 'PAID' : 'ACTIVE',
  };
}
