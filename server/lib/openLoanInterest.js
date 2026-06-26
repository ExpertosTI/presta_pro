/** Utilidades para interés en préstamos abiertos (servidor) */

const { daysBetween, parseDateOnly } = require('./dateUtils');

const OPEN_LOAN_FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

function normalizeOpenFrequency(frequency) {
  if (OPEN_LOAN_FREQUENCIES.includes(frequency)) return frequency;
  return 'Mensual';
}

function getDaysPerPeriod(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 1;
    case 'Semanal': return 7;
    case 'Quincenal': return 15;
    case 'Mensual': return 30;
    default: return 30;
  }
}

function getPeriodsPerYear(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 365;
    case 'Semanal': return 52;
    case 'Quincenal': return 24;
    case 'Mensual': return 12;
    default: return 12;
  }
}

function getPeriodRatePercent(periodRatePercent) {
  return parseFloat(periodRatePercent) || 0;
}

function calculateAccruedInterest(principal, periodRatePercent, frequency, daysSinceLastCalc) {
  const basePrincipal = parseFloat(principal) || 0;
  const days = parseInt(daysSinceLastCalc, 10) || 0;
  if (basePrincipal <= 0 || days <= 0) return 0;

  const rateDecimal = (parseFloat(periodRatePercent) || 0) / 100;
  const elapsedPeriods = days / getDaysPerPeriod(frequency);
  return parseFloat((basePrincipal * rateDecimal * elapsedPeriods).toFixed(2));
}

function calculatePeriodInterest(principal, periodRatePercent) {
  const basePrincipal = parseFloat(principal) || 0;
  if (basePrincipal <= 0) return 0;
  const rateDecimal = (parseFloat(periodRatePercent) || 0) / 100;
  return parseFloat((basePrincipal * rateDecimal).toFixed(2));
}

function getOpenLoanPrincipal(loan) {
  if (!loan) return 0;
  const base = (parseFloat(loan.amount) || 0) + (parseFloat(loan.closingCosts) || 0);
  const paidToPrincipal = (loan.freePayments || []).reduce(
    (sum, p) => sum + (parseFloat(p.toPrincipal) || 0),
    0
  );
  return parseFloat(Math.max(0, base - paidToPrincipal).toFixed(2));
}

function calculatePeriodMora(periodInterest, penaltyRatePercent = 5) {
  const rate = parseFloat(penaltyRatePercent) || 0;
  if (rate <= 0) return 0;
  return parseFloat(((parseFloat(periodInterest) || 0) * rate / 100).toFixed(2));
}

function buildOpenLoanPeriods(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
  if (!loan) return [];

  const principal = getOpenLoanPrincipal(loan);
  if (principal <= 0) return [];

  const frequency = loan.frequency || 'Mensual';
  const periodRate = loan.dailyRate ?? loan.rate ?? 0;
  const periodInterest = calculatePeriodInterest(principal, periodRate);
  const daysPerPeriod = getDaysPerPeriod(frequency);
  const start = parseDateOnly(loan.startDate);
  const ref = parseDateOnly(asOfDate);
  if (!start || !ref || periodInterest <= 0) return [];

  const interestPaid = (loan.freePayments || [])
    .reduce((sum, p) => sum + (parseFloat(p.toInterest) || 0), 0);
  let remainingPool = interestPaid;

  const periods = [];
  let dueDate = new Date(start);
  dueDate.setDate(dueDate.getDate() + daysPerPeriod);

  for (let n = 1; n <= 360; n++) {
    const due = parseDateOnly(dueDate);
    const isOverdue = due < ref;

    const paidAmount = Math.min(remainingPool, periodInterest);
    remainingPool = parseFloat(Math.max(0, remainingPool - paidAmount).toFixed(2));

    const pendingAmount = parseFloat(Math.max(0, periodInterest - paidAmount).toFixed(2));
    let status = 'UPCOMING';
    if (paidAmount >= periodInterest - 0.01) status = 'PAID';
    else if (isOverdue) status = 'OVERDUE';
    else if (due <= ref) status = 'DUE';

    const mora = status === 'OVERDUE'
      ? calculatePeriodMora(pendingAmount || periodInterest, penaltyRatePercent)
      : 0;

    periods.push({
      number: n,
      date: dueDate,
      interest: periodInterest,
      mora,
      paidAmount,
      pendingAmount: status === 'PAID' ? 0 : pendingAmount,
      payment: periodInterest,
      principal: 0,
      balance: principal,
      status,
      daysOverdue: isOverdue && status !== 'PAID' ? daysBetween(due, ref) : 0
    });

    const futureCount = periods.filter(p => p.status === 'UPCOMING').length;
    if (due > ref && futureCount >= 2) break;
    if (n >= 120 && due > ref) break;

    dueDate = new Date(dueDate);
    dueDate.setDate(dueDate.getDate() + daysPerPeriod);
  }

  return periods;
}

function getOpenLoanSummary(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
  const periods = buildOpenLoanPeriods(loan, asOfDate, penaltyRatePercent);
  const principal = getOpenLoanPrincipal(loan);
  const pendingInterest = periods
    .filter(p => p.status !== 'PAID' && p.status !== 'UPCOMING')
    .reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
  const totalMora = periods
    .filter(p => p.status === 'OVERDUE')
    .reduce((sum, p) => sum + (p.mora || 0), 0);
  const nextDue = periods.find(p => p.status === 'DUE' || p.status === 'OVERDUE' || p.status === 'UPCOMING');
  const overdueCount = periods.filter(p => p.status === 'OVERDUE').length;
  const periodInterest = calculatePeriodInterest(principal, loan?.rate ?? 0);

  return {
    periods,
    principal,
    pendingInterest: parseFloat(pendingInterest.toFixed(2)),
    totalMora: parseFloat(totalMora.toFixed(2)),
    totalPending: parseFloat((pendingInterest + totalMora).toFixed(2)),
    nextDue,
    overdueCount,
    periodInterest
  };
}

function calculateTotalPendingInterest(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
  if (!loan) return 0;
  return getOpenLoanSummary(loan, asOfDate, penaltyRatePercent).totalPending;
}

function countOverdueInstallments(schedule = [], asOfDate = new Date()) {
  const ref = parseDateOnly(asOfDate);
  if (!ref || !Array.isArray(schedule)) return 0;
  return schedule.filter(inst => {
    if (inst.status === 'PAID') return false;
    const due = parseDateOnly(inst.date);
    return due && due < ref;
  }).length;
}

function getRetrospectiveLoanSummary(loan, installments = [], asOfDate = new Date(), penaltyRatePercent = 5) {
  if (!loan) return null;
  const start = parseDateOnly(loan.startDate);
  const today = parseDateOnly(asOfDate);
  const retrospective = !!(start && today && start < today);
  const daysSinceStart = daysBetween(loan.startDate, asOfDate);
  const isOpen = loan.loanType === 'OPEN';

  const loanForCalc = { ...loan, freePayments: loan.freePayments || [] };

  return {
    isRetrospective: retrospective,
    daysSinceStart,
    pendingInterest: isOpen
      ? calculateTotalPendingInterest(loanForCalc, asOfDate, penaltyRatePercent)
      : 0,
    overdueInstallments: isOpen
      ? getOpenLoanSummary(loanForCalc, asOfDate, penaltyRatePercent).overdueCount
      : countOverdueInstallments(installments, asOfDate)
  };
}

function calculateOpenLoanSchedule(principal, periodRatePercent, frequency, term, startDate) {
  const schedule = [];
  const basePrincipal = parseFloat(principal) || 0;
  const totalTerms = parseInt(term, 10) || 0;
  if (basePrincipal <= 0 || totalTerms <= 0) return [];

  let currentDate = new Date(startDate);
  const daysPerPeriod = getDaysPerPeriod(frequency);

  for (let i = 1; i <= totalTerms; i++) {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + daysPerPeriod);

    const interest = calculatePeriodInterest(basePrincipal, periodRatePercent);

    schedule.push({
      number: i,
      date: new Date(currentDate),
      payment: interest,
      interest,
      principal: 0,
      balance: basePrincipal,
      status: 'PENDING'
    });
  }

  return schedule;
}

module.exports = {
  OPEN_LOAN_FREQUENCIES,
  normalizeOpenFrequency,
  getDaysPerPeriod,
  getPeriodsPerYear,
  getPeriodRatePercent,
  calculateAccruedInterest,
  calculatePeriodInterest,
  getOpenLoanPrincipal,
  calculatePeriodMora,
  buildOpenLoanPeriods,
  getOpenLoanSummary,
  calculateTotalPendingInterest,
  countOverdueInstallments,
  getRetrospectiveLoanSummary,
  calculateOpenLoanSchedule
};
