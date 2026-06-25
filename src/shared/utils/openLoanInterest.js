/** Utilidades compartidas para interés en préstamos abiertos */

import { daysBetween, isPastDate, parseDateOnly, startOfToday } from './dateUtils';
import { calculateSchedule } from './amortization';

export const OPEN_LOAN_FREQUENCIES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

export function normalizeOpenFrequency(frequency) {
  if (OPEN_LOAN_FREQUENCIES.includes(frequency)) return frequency;
  return 'Diario';
}

export function getDaysPerPeriod(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 1;
    case 'Semanal': return 7;
    case 'Quincenal': return 15;
    case 'Mensual': return 30;
    default: return 1;
  }
}

export function getPeriodsPerYear(frequency) {
  switch (normalizeOpenFrequency(frequency)) {
    case 'Diario': return 365;
    case 'Semanal': return 52;
    case 'Quincenal': return 24;
    case 'Mensual': return 12;
    default: return 365;
  }
}

/** Tasa por período en % (ej. 1.67 para ~20% anual mensual) */
export function getPeriodRatePercent(annualRatePercent, frequency, customPeriodRatePercent = null) {
  const custom = parseFloat(customPeriodRatePercent);
  if (!Number.isNaN(custom) && custom > 0) return custom;
  const annual = parseFloat(annualRatePercent) || 0;
  return annual / getPeriodsPerYear(normalizeOpenFrequency(frequency));
}

/** Interés acumulado proporcional al tiempo transcurrido */
export function calculateAccruedInterest(principal, annualRatePercent, frequency, daysSinceLastCalc, customPeriodRatePercent = null) {
  const basePrincipal = parseFloat(principal) || 0;
  const days = parseInt(daysSinceLastCalc, 10) || 0;
  if (basePrincipal <= 0 || days <= 0) return 0;

  const periodRateDecimal = getPeriodRatePercent(annualRatePercent, frequency, customPeriodRatePercent) / 100;
  const elapsedPeriods = days / getDaysPerPeriod(frequency);
  return parseFloat((basePrincipal * periodRateDecimal * elapsedPeriods).toFixed(2));
}

/** Interés de un período completo sobre el capital vigente */
export function calculatePeriodInterest(principal, annualRatePercent, frequency, customPeriodRatePercent = null) {
  const basePrincipal = parseFloat(principal) || 0;
  if (basePrincipal <= 0) return 0;
  const periodRateDecimal = getPeriodRatePercent(annualRatePercent, frequency, customPeriodRatePercent) / 100;
  return parseFloat((basePrincipal * periodRateDecimal).toFixed(2));
}

/** Interés total pendiente (guardado + devengado desde último cálculo) */
export function calculateTotalPendingInterest(loan, asOfDate = new Date()) {
  if (!loan) return 0;
  const lastCalc = loan.lastInterestCalc || loan.startDate;
  const daysSince = daysBetween(lastCalc, asOfDate);
  const principal = parseFloat(loan.currentBalance ?? loan.amount ?? 0) || 0;
  const accrued = parseFloat(loan.interestAccrued || 0) || 0;
  const newlyAccrued = calculateAccruedInterest(
    principal,
    loan.rate,
    loan.frequency || 'Diario',
    daysSince,
    loan.dailyRate
  );
  return parseFloat((accrued + newlyAccrued).toFixed(2));
}

/** Cuotas vencidas de un préstamo fijo a una fecha de referencia */
export function countOverdueInstallments(schedule = [], asOfDate = new Date()) {
  const ref = parseDateOnly(asOfDate);
  if (!ref || !Array.isArray(schedule)) return 0;
  return schedule.filter(inst => {
    if (inst.status === 'PAID') return false;
    const due = parseDateOnly(inst.date);
    return due && due < ref;
  }).length;
}

/** Resumen para préstamos retroactivos (fecha inicio anterior a hoy) */
export function getRetrospectiveLoanSummary(loan, asOfDate = new Date()) {
  if (!loan) return null;

  const start = parseDateOnly(loan.startDate);
  const today = parseDateOnly(asOfDate);
  const retrospective = !!(start && today && start < today);
  const daysSinceStart = daysBetween(loan.startDate, asOfDate);

  const isOpen = loan.loanType === 'OPEN';
  const pendingInterest = isOpen ? calculateTotalPendingInterest(loan, asOfDate) : 0;
  const overdueInstallments = !isOpen
    ? countOverdueInstallments(loan.schedule || loan.installments || [], asOfDate)
    : 0;

  return {
    isRetrospective: retrospective,
    daysSinceStart,
    pendingInterest,
    overdueInstallments
  };
}

/** Vista previa al crear un préstamo con fecha retroactiva */
export function previewRetrospectiveLoan({
  loanType,
  amount,
  closingCosts = 0,
  rate,
  frequency,
  dailyRate,
  startDate,
  term,
  amortizationType = 'FLAT'
}, asOfDate = new Date()) {
  const principal = (parseFloat(amount) || 0) + (parseFloat(closingCosts) || 0);
  const start = parseDateOnly(startDate);
  const today = parseDateOnly(asOfDate);
  if (!start || !today || start >= today || principal <= 0) {
    return { isRetrospective: false, daysSinceStart: 0, pendingInterest: 0, overdueInstallments: 0 };
  }

  const daysSinceStart = daysBetween(startDate, asOfDate);
  const isOpen = loanType === 'OPEN';

  if (isOpen) {
    return {
      isRetrospective: true,
      daysSinceStart,
      pendingInterest: calculateAccruedInterest(
        principal,
        rate,
        frequency || 'Mensual',
        daysSinceStart,
        dailyRate ? parseFloat(dailyRate) : null
      ),
      overdueInstallments: 0,
      periodInterest: calculatePeriodInterest(
        principal,
        rate,
        frequency || 'Mensual',
        dailyRate ? parseFloat(dailyRate) : null
      )
    };
  }

  const schedule = calculateSchedule(
    principal,
    rate,
    term,
    frequency,
    startDate,
    amortizationType
  );

  return {
    isRetrospective: true,
    daysSinceStart,
    pendingInterest: 0,
    overdueInstallments: countOverdueInstallments(schedule, asOfDate),
    totalPendingInstallments: schedule.filter(s => s.status !== 'PAID').length
  };
}

export { isPastDate, parseDateOnly, startOfToday, daysBetween };

/** Simulación de préstamo abierto con abonos solo a interés (capital intacto) */
export function calculateOpenLoanSchedule(principal, annualRatePercent, frequency, term, startDate, customPeriodRatePercent = null) {
  const schedule = [];
  const basePrincipal = parseFloat(principal) || 0;
  const totalTerms = parseInt(term, 10) || 0;
  if (basePrincipal <= 0 || totalTerms <= 0) return [];

  let currentDate = new Date(startDate);
  const daysPerPeriod = getDaysPerPeriod(frequency);
  let cumulativeInterest = 0;

  for (let i = 1; i <= totalTerms; i++) {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + daysPerPeriod);

    const interest = calculatePeriodInterest(basePrincipal, annualRatePercent, frequency, customPeriodRatePercent);
    cumulativeInterest += interest;

    schedule.push({
      number: i,
      date: currentDate.toISOString().split('T')[0],
      payment: interest,
      interest,
      principal: 0,
      balance: basePrincipal,
      cumulativeInterest: parseFloat(cumulativeInterest.toFixed(2))
    });
  }

  return schedule;
}

/** Comparativa de rédito por frecuencia (préstamos abiertos) */
export function calculateOpenInterestComparison(principal, annualRatePercent, customPeriodRatePercent = null) {
  const frequencies = ['Semanal', 'Quincenal', 'Mensual', 'Diario'];
  return frequencies.map(frequency => ({
    frequency,
    periodInterest: calculatePeriodInterest(principal, annualRatePercent, frequency, customPeriodRatePercent),
    periodRatePercent: getPeriodRatePercent(annualRatePercent, frequency, customPeriodRatePercent)
  }));
}
