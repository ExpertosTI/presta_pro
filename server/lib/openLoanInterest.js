/** Utilidades para interés en préstamos abiertos (servidor) */

const { daysBetween, parseDateOnly } = require('./dateUtils');

const OPEN_LOAN_FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

function normalizeOpenFrequency(frequency) {
  if (OPEN_LOAN_FREQUENCIES.includes(frequency)) return frequency;
  return 'Diario';
}

function getDaysPerPeriod(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 1;
    case 'Semanal': return 7;
    case 'Quincenal': return 15;
    case 'Mensual': return 30;
    default: return 1;
  }
}

function getPeriodsPerYear(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 365;
    case 'Semanal': return 52;
    case 'Quincenal': return 24;
    case 'Mensual': return 12;
    default: return 365;
  }
}

// Para préstamos ABIERTOS la tasa es directa por período (no anual ÷ 12).
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

function calculateTotalPendingInterest(loan, asOfDate = new Date()) {
  if (!loan) return 0;
  const lastCalc = loan.lastInterestCalc || loan.startDate;
  const daysSince = daysBetween(lastCalc, asOfDate);
  const principal = parseFloat(loan.currentBalance ?? loan.amount ?? 0) || 0;
  const accrued = parseFloat(loan.interestAccrued || 0) || 0;
  const effectiveRate = loan.dailyRate ?? loan.rate ?? 0;
  const newlyAccrued = calculateAccruedInterest(
    principal,
    effectiveRate,
    loan.frequency || 'Mensual',
    daysSince
  );
  return parseFloat((accrued + newlyAccrued).toFixed(2));
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

function getRetrospectiveLoanSummary(loan, installments = [], asOfDate = new Date()) {
  if (!loan) return null;
  const start = parseDateOnly(loan.startDate);
  const today = parseDateOnly(asOfDate);
  const retrospective = !!(start && today && start < today);
  const daysSinceStart = daysBetween(loan.startDate, asOfDate);
  const isOpen = loan.loanType === 'OPEN';

  let currentBalance = loan.amount + (loan.closingCosts || 0);
  if (loan.freePayments) {
    const paidPrincipal = loan.freePayments.reduce((sum, p) => sum + (p.toPrincipal || 0), 0);
    currentBalance -= paidPrincipal;
  }

  const loanForInterest = { ...loan, currentBalance };

  return {
    isRetrospective: retrospective,
    daysSinceStart,
    pendingInterest: isOpen ? calculateTotalPendingInterest(loanForInterest, asOfDate) : 0,
    overdueInstallments: !isOpen ? countOverdueInstallments(installments, asOfDate) : 0
  };
}

module.exports = {
  OPEN_LOAN_FREQUENCIES,
  normalizeOpenFrequency,
  getDaysPerPeriod,
  getPeriodsPerYear,
  getPeriodRatePercent,
  calculateAccruedInterest,
  calculatePeriodInterest,
  calculateTotalPendingInterest,
  countOverdueInstallments,
  getRetrospectiveLoanSummary
};
