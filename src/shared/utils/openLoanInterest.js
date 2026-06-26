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

/**
 * Para préstamos ABIERTOS la tasa se maneja directamente por período
 * (ej: 5% mensual = se cobra 5% del capital cada mes).
 * No se divide entre períodos del año.
 */
export function getPeriodRatePercent(periodRatePercent, _frequency = null, _deprecated = null) {
  return parseFloat(periodRatePercent) || 0;
}

/** Interés acumulado proporcional al tiempo transcurrido */
export function calculateAccruedInterest(principal, periodRatePercent, frequency, daysSinceLastCalc) {
  const basePrincipal = parseFloat(principal) || 0;
  const days = parseInt(daysSinceLastCalc, 10) || 0;
  if (basePrincipal <= 0 || days <= 0) return 0;

  const rateDecimal = (parseFloat(periodRatePercent) || 0) / 100;
  const elapsedPeriods = days / getDaysPerPeriod(frequency);
  return parseFloat((basePrincipal * rateDecimal * elapsedPeriods).toFixed(2));
}

/** Interés de un período completo sobre el capital vigente */
export function calculatePeriodInterest(principal, periodRatePercent, frequency = null) {
  const basePrincipal = parseFloat(principal) || 0;
  if (basePrincipal <= 0) return 0;
  const rateDecimal = (parseFloat(periodRatePercent) || 0) / 100;
  return parseFloat((basePrincipal * rateDecimal).toFixed(2));
}

/** Capital vigente de un préstamo abierto (monto inicial − abonos a capital) */
export function getOpenLoanPrincipal(loan) {
  if (!loan) return 0;
  const base = (parseFloat(loan.amount) || 0) + (parseFloat(loan.closingCosts) || 0);
  const paidToPrincipal = (loan.freePayments || []).reduce(
    (sum, p) => sum + (parseFloat(p.toPrincipal) || 0),
    0
  );
  return parseFloat(Math.max(0, base - paidToPrincipal).toFixed(2));
}

/** Mora sobre un período vencido (% del rédito del período) */
export function calculatePeriodMora(periodInterest, penaltyRatePercent = 5) {
  const rate = parseFloat(penaltyRatePercent) || 0;
  if (rate <= 0) return 0;
  return parseFloat(((parseFloat(periodInterest) || 0) * rate / 100).toFixed(2));
}

/**
 * Construye los períodos de rédito de un préstamo abierto.
 * Cada período genera un rédito fijo (% del capital vigente) con fecha de vencimiento.
 * Los abonos a interés se aplican en orden cronológico a los períodos más antiguos.
 */
export function buildOpenLoanPeriods(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
  if (!loan) return [];

  const principal = loan.currentBalance != null
    ? parseFloat(loan.currentBalance) || 0
    : getOpenLoanPrincipal(loan);
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

    const mora = status === 'OVERDUE' ? calculatePeriodMora(pendingAmount || periodInterest, penaltyRatePercent) : 0;

    periods.push({
      number: n,
      id: `open-period-${n}`,
      date: dueDate.toISOString().split('T')[0],
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

/** Resumen consolidado de un préstamo abierto */
export function getOpenLoanSummary(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
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

/** Interés total pendiente (períodos vencidos + moras) */
export function calculateTotalPendingInterest(loan, asOfDate = new Date(), penaltyRatePercent = 5) {
  if (!loan) return 0;
  return getOpenLoanSummary(loan, asOfDate, penaltyRatePercent).totalPending;
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
  const overdueInstallments = isOpen
    ? (getOpenLoanSummary(loan, asOfDate).overdueCount || 0)
    : countOverdueInstallments(loan.schedule || loan.installments || [], asOfDate);

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
    const periodInterest = calculatePeriodInterest(principal, parseFloat(rate) || 0);
    const elapsedPeriods = Math.floor(daysSinceStart / getDaysPerPeriod(frequency || 'Mensual'));
    const pendingInterest = parseFloat((elapsedPeriods * periodInterest).toFixed(2));
    return {
      isRetrospective: true,
      daysSinceStart,
      pendingInterest,
      overdueInstallments: elapsedPeriods,
      periodInterest
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

    const interest = calculatePeriodInterest(basePrincipal, annualRatePercent);
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

/**
 * Comparativa informativa: dado un capital y una tasa base por período,
 * muestra cuánto sería el rédito en distintas frecuencias si la tasa se
 * ajustara proporcionalmente al período (referencia para decisión del usuario).
 */
export function calculateOpenInterestComparison(principal, periodRatePercent) {
  // Convertimos la tasa del período base a tasa diaria para comparar equivalentemente
  // No se calcula así en los préstamos reales; esto es solo referencia de simulación.
  const rate = parseFloat(periodRatePercent) || 0;
  // Devolvemos el interés con la tasa directa en cada frecuencia (la misma tasa)
  const frequencies = ['Semanal', 'Quincenal', 'Mensual', 'Diario'];
  return frequencies.map(frequency => ({
    frequency,
    periodInterest: calculatePeriodInterest(principal, rate),
    periodRatePercent: rate
  }));
}
