import { generateId } from './ids';

// Algoritmo de Amortización (Sistema Francés)
// Algoritmo de Amortización
export const calculateSchedule = (amount, rate, term, frequency, startDate, type = 'FRENCH') => {
  const schedule = [];
  const principalAmount = parseFloat(amount) || 0;
  let balance = principalAmount;
  // Si la tasa es mensual (común en préstamos personales), no dividir entre 12 si frequency es mensual?
  // Mantenemos lógica actual: 'rate' se trata como TASA ANUAL en la lógica existente (annualRate = rate/100).
  // Si queremos tasa mensual directa, habría que cambiar esto, pero rompería compatibilidad.
  // Asumiremos que el usuario ingresa la tasa anualizada o ajustamos la lógica si es necesario.
  // UPDATE: Para préstamos informales, a menudo la tasa es MENSUAL (ej 10% mensual).
  // Si frequency=Mensual y rate=10, ratePerPeriod debería ser 0.10.
  // En el código original: ratePerPeriod = (10/100) / 12 = 0.0083.
  // SI EL USUARIO PONE 10% MENSUAL, espera pagar 100 de 1000.
  // Voy a mantener la lógica original por seguridad, pero ojo con esto.

  const annualRate = (parseFloat(rate) || 0) / 100;
  const totalTerms = parseInt(term, 10) || 0;

  let periodsPerYear = 12;
  let daysPerPeriod = 30;

  switch (frequency) {
    case 'Diario': periodsPerYear = 365; daysPerPeriod = 1; break;
    case 'Semanal': periodsPerYear = 52; daysPerPeriod = 7; break;
    case 'Quincenal': periodsPerYear = 24; daysPerPeriod = 15; break;
    case 'Mensual': periodsPerYear = 12; daysPerPeriod = 30; break;
    default: periodsPerYear = 12;
  }

  if (!principalAmount || (!totalTerms && type !== 'OPEN')) return [];

  const ratePerPeriod = annualRate / periodsPerYear;
  let pmt = 0;
  let currentDate = new Date(startDate);

  // Lógica FLAT (Interés Simple sobre Saldo Absoluto)
  if (type === 'FLAT') {
    const totalInterest = principalAmount * annualRate;
    const totalAmount = principalAmount + totalInterest;
    const regularPayment = parseFloat((totalAmount / totalTerms).toFixed(2));
    const interestPerPayment = parseFloat((totalInterest / totalTerms).toFixed(2));
    const principalPerPayment = parseFloat((principalAmount / totalTerms).toFixed(2));

    let remainingBalance = principalAmount;
    let totalPaid = 0;

    for (let i = 1; i <= totalTerms; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerPeriod);

      let payment = regularPayment;
      let principal = principalPerPayment;
      let interest = interestPerPayment;

      if (i === totalTerms) {
        const remaining = totalAmount - totalPaid;
        payment = parseFloat(remaining.toFixed(2));
        principal = remainingBalance;
        interest = parseFloat((payment - principal).toFixed(2));
      }

      remainingBalance = parseFloat((remainingBalance - principal).toFixed(2));
      if (remainingBalance < 0) remainingBalance = 0;
      totalPaid += payment;

      schedule.push({
        id: generateId(),
        number: i,
        date: currentDate.toISOString().split('T')[0],
        payment,
        interest,
        principal,
        balance: remainingBalance,
        status: 'PENDING',
        paidAmount: 0,
        paidDate: null
      });
    }
    return schedule;
  }

  // Lógica INTERES SOLAMENTE (Cuota fija = Interés, Capital al final o nunca)
  if (type === 'INTEREST_ONLY') {
    const interestPayment = parseFloat((principalAmount * ratePerPeriod).toFixed(2));
    pmt = interestPayment;

    for (let i = 1; i <= totalTerms; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerPeriod);
      schedule.push({
        id: generateId(),
        number: i,
        date: currentDate.toISOString().split('T')[0],
        payment: pmt,
        interest: interestPayment,
        principal: 0,
        balance: principalAmount, // Deuda se mantiene
        status: 'PENDING',
        paidAmount: 0,
        paidDate: null
      });
    }
    return schedule;
  }

  // SISTEMA FRANCES (Original)
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

    // Ajuste último pago
    if (i === totalTerms) {
      principal = balance;
      pmt = principal + interest;
    }

    balance = parseFloat((balance - principal).toFixed(2));
    if (balance < 0) balance = 0;

    currentDate.setDate(currentDate.getDate() + daysPerPeriod);

    schedule.push({
      id: generateId(),
      number: i,
      date: currentDate.toISOString().split('T')[0],
      payment: parseFloat(pmt.toFixed(2)),
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

export const calculateInstallmentVal = (amount, rate, term, frequency, type = 'FLAT') => {
  const principal = parseFloat(amount) || 0;
  const rateVal = parseFloat(rate) || 0;
  const n = parseInt(term, 10) || 0;
  if (principal <= 0 || n <= 0) return '';

  if (type === 'FLAT') {
    const totalInterest = principal * (rateVal / 100);
    const totalAmount = principal + totalInterest;
    return (totalAmount / n).toFixed(2);
  } else if (type === 'INTEREST_ONLY') {
    let periodsPerYear = 12;
    switch (frequency) {
      case 'Diario': periodsPerYear = 365; break;
      case 'Semanal': periodsPerYear = 52; break;
      case 'Quincenal': periodsPerYear = 24; break;
      case 'Mensual': periodsPerYear = 12; break;
    }
    const ratePerPeriod = (rateVal / 100) / periodsPerYear;
    return (principal * ratePerPeriod).toFixed(2);
  } else if (type === 'FRENCH') {
    let periodsPerYear = 12;
    switch (frequency) {
      case 'Diario': periodsPerYear = 365; break;
      case 'Semanal': periodsPerYear = 52; break;
      case 'Quincenal': periodsPerYear = 24; break;
      case 'Mensual': periodsPerYear = 12; break;
    }
    const ratePerPeriod = (rateVal / 100) / periodsPerYear;
    if (ratePerPeriod === 0) {
      return (principal / n).toFixed(2);
    } else {
      const pmt = (principal * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -n));
      return pmt.toFixed(2);
    }
  }
  return '';
};

export const calculateRateFromInstallment = (amount, installment, term, frequency, type = 'FLAT') => {
  const principal = parseFloat(amount) || 0;
  const pmt = parseFloat(installment) || 0;
  const n = parseInt(term, 10) || 0;
  if (principal <= 0 || pmt <= 0 || n <= 0) return '';

  if (type === 'FLAT') {
    const rate = ((pmt * n / principal) - 1) * 100;
    return Math.max(0, rate).toFixed(2);
  } else if (type === 'INTEREST_ONLY') {
    let periodsPerYear = 12;
    switch (frequency) {
      case 'Diario': periodsPerYear = 365; break;
      case 'Semanal': periodsPerYear = 52; break;
      case 'Quincenal': periodsPerYear = 24; break;
      case 'Mensual': periodsPerYear = 12; break;
    }
    const annualRate = (pmt / principal) * periodsPerYear * 100;
    return Math.max(0, annualRate).toFixed(2);
  } else if (type === 'FRENCH') {
    let periodsPerYear = 12;
    switch (frequency) {
      case 'Diario': periodsPerYear = 365; break;
      case 'Semanal': periodsPerYear = 52; break;
      case 'Quincenal': periodsPerYear = 24; break;
      case 'Mensual': periodsPerYear = 12; break;
    }
    let low = 0;
    let high = 5;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (low + high) / 2;
      const calculatedPmt = mid === 0 ? (principal / n) : (principal * mid) / (1 - Math.pow(mid + 1, -n));
      if (calculatedPmt > pmt) {
        high = mid;
      } else {
        low = mid;
      }
    }
    const r = (low + high) / 2;
    const annualRate = r * periodsPerYear * 100;
    return Math.max(0, annualRate).toFixed(2);
  }
  return '';
};

