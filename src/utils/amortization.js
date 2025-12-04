import { generateId } from './ids';

// Algoritmo de Amortización (Sistema Francés)
export const calculateSchedule = (amount, rate, term, frequency, startDate) => {
  const schedule = [];
  const principalAmount = parseFloat(amount) || 0;
  let balance = principalAmount;
  const annualRate = (parseFloat(rate) || 0) / 100;
  const totalTerms = parseInt(term, 10) || 0;
  
  let periodsPerYear = 12;
  let daysPerPeriod = 30;
  
  switch(frequency) {
    case 'Diario': periodsPerYear = 365; daysPerPeriod = 1; break;
    case 'Semanal': periodsPerYear = 52; daysPerPeriod = 7; break;
    case 'Quincenal': periodsPerYear = 24; daysPerPeriod = 15; break;
    case 'Mensual': periodsPerYear = 12; daysPerPeriod = 30; break;
    default: periodsPerYear = 12;
  }

  if (!principalAmount || !totalTerms) return [];

  const ratePerPeriod = annualRate / periodsPerYear;
  let pmt = 0;

  if (ratePerPeriod === 0) {
    // Préstamo sin interés: cuota fija capital / cuotas
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
      id: generateId(),
      number: i,
      date: currentDate.toISOString().split('T')[0],
      payment: pmt,
      interest,
      principal,
      balance,
      status: 'PENDING',
      paidAmount: 0,
      paidDate: null
    });
  }
  return schedule;
};
