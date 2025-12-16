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

  // FLAT / Saldo Absoluto (Préstamos Informales)
  // Cálculo simple: Interés Total = Capital × Tasa
  // Cuota Fija = (Capital + Interés Total) / Plazo
  if (type === 'FLAT') {
    // La tasa se aplica directamente al capital (no es tasa anual, es tasa simple del préstamo)
    const totalInterest = principalAmount * (parseFloat(rate) / 100);
    const totalToPay = principalAmount + totalInterest;
    const fixedPayment = parseFloat((totalToPay / totalTerms).toFixed(2));
    const fixedInterest = parseFloat((totalInterest / totalTerms).toFixed(2));
    const fixedPrincipal = parseFloat((principalAmount / totalTerms).toFixed(2));

    for (let i = 1; i <= totalTerms; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerPeriod);
      balance = parseFloat((principalAmount - (fixedPrincipal * i)).toFixed(2));
      if (balance < 0) balance = 0;

      // Ajuste última cuota para cuadrar exacto
      let payment = fixedPayment;
      let principal = fixedPrincipal;
      let interest = fixedInterest;

      if (i === totalTerms) {
        // Ajustar para que sume exacto
        const sumPaid = fixedPayment * (totalTerms - 1);
        payment = parseFloat((totalToPay - sumPaid).toFixed(2));
        balance = 0;
      }

      schedule.push({
        id: generateId(),
        number: i,
        date: currentDate.toISOString().split('T')[0],
        payment,
        interest,
        principal,
        balance,
        status: 'PENDING',
        paidAmount: 0,
        paidDate: null
      });
    }
    return schedule;
  }

  // FIXED_PROFIT - Define target profit amount (Dominican lending model)
  // Example: Lend $10,000, want to earn $2,000 profit = Total $12,000 / 12 cuotas = $1,000/cuota
  if (type === 'FIXED_PROFIT') {
    // 'rate' here is the PROFIT AMOUNT (not percentage)
    const targetProfit = parseFloat(rate) || 0;
    const totalToPay = principalAmount + targetProfit;
    const fixedPayment = parseFloat((totalToPay / totalTerms).toFixed(2));
    const fixedInterest = parseFloat((targetProfit / totalTerms).toFixed(2));
    const fixedPrincipal = parseFloat((principalAmount / totalTerms).toFixed(2));

    for (let i = 1; i <= totalTerms; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerPeriod);
      balance = parseFloat((principalAmount - (fixedPrincipal * i)).toFixed(2));
      if (balance < 0) balance = 0;

      let payment = fixedPayment;
      if (i === totalTerms) {
        const sumPaid = fixedPayment * (totalTerms - 1);
        payment = parseFloat((totalToPay - sumPaid).toFixed(2));
        balance = 0;
      }

      schedule.push({
        id: generateId(),
        number: i,
        date: currentDate.toISOString().split('T')[0],
        payment,
        interest: fixedInterest,
        principal: fixedPrincipal,
        balance,
        status: 'PENDING',
        paidAmount: 0,
        paidDate: null
      });
    }
    return schedule;
  }

  // FIXED_PAYMENT - Define exact installment amount
  // Example: Each payment is exactly $1,500, calculate total and profit from that
  if (type === 'FIXED_PAYMENT') {
    // 'rate' here is the FIXED PAYMENT AMOUNT per period
    const fixedPayment = parseFloat(rate) || 0;
    const totalToPay = fixedPayment * totalTerms;
    const totalProfit = totalToPay - principalAmount;
    const fixedPrincipal = parseFloat((principalAmount / totalTerms).toFixed(2));
    const fixedInterest = parseFloat((totalProfit / totalTerms).toFixed(2));

    for (let i = 1; i <= totalTerms; i++) {
      currentDate.setDate(currentDate.getDate() + daysPerPeriod);
      balance = parseFloat((principalAmount - (fixedPrincipal * i)).toFixed(2));
      if (balance < 0) balance = 0;

      let payment = fixedPayment;
      if (i === totalTerms) {
        const sumPaid = fixedPayment * (totalTerms - 1);
        payment = parseFloat((totalToPay - sumPaid).toFixed(2));
        balance = 0;
      }

      schedule.push({
        id: generateId(),
        number: i,
        date: currentDate.toISOString().split('T')[0],
        payment,
        interest: fixedInterest,
        principal: fixedPrincipal,
        balance,
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
