import { useState, useCallback } from 'react';
import { useAppData } from '../../../context/AppDataContext';

/**
 * Payment flow state machine:
 * idle → calculating → confirming → submitting → printing → done
 * Any state can transition to 'error' and back to 'idle'
 */
const STATES = {
  IDLE: 'idle',
  CALCULATING: 'calculating',
  CONFIRMING: 'confirming',
  SUBMITTING: 'submitting',
  PRINTING: 'printing',
  DONE: 'done',
  ERROR: 'error',
};

export function usePaymentFlow() {
  const { registerPayment, dbData } = useAppData();
  const [state, setState] = useState(STATES.IDLE);
  const [paymentData, setPaymentData] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  const calculatePayment = useCallback((loanId, installmentId, options = {}) => {
    setState(STATES.CALCULATING);
    setError(null);

    const loan = dbData.loans.find(l => l.id === loanId);
    if (!loan) {
      setError('Préstamo no encontrado');
      setState(STATES.ERROR);
      return;
    }

    const client = dbData.clients.find(c => c.id === loan.clientId);
    const schedule = loan.schedule || loan.installments || [];
    const pendingInstallments = schedule
      .filter(s => s.status !== 'PAID')
      .sort((a, b) => (a.number || 0) - (b.number || 0));

    const firstInstallment = pendingInstallments.find(s => s.id === installmentId) || pendingInstallments[0];
    const paymentAmount = options.customAmount || firstInstallment?.payment || 0;
    const penaltyAmount = options.penaltyAmount || 0;

    // Calculate breakdown
    const breakdown = [];
    let remaining = paymentAmount;
    for (const inst of pendingInstallments) {
      if (remaining <= 0) break;
      const previouslyPaid = inst.paidAmount || 0;
      const stillOwed = (inst.payment || paymentAmount) - previouslyPaid;
      const amount = Math.min(remaining, stillOwed);
      breakdown.push({
        number: inst.number,
        id: inst.id,
        amount,
        isPartial: amount < stillOwed - 0.01,
      });
      remaining -= amount;
      if (remaining < 1) break;
    }

    const data = {
      loanId,
      installmentId: firstInstallment?.id || installmentId,
      options,
      loan,
      client,
      paymentAmount,
      penaltyAmount,
      totalAmount: paymentAmount + penaltyAmount,
      breakdown,
      installmentCount: breakdown.length,
      isPartialPayment: breakdown.every(b => b.isPartial),
    };

    setPaymentData(data);
    setState(STATES.CONFIRMING);
    return data;
  }, [dbData.loans, dbData.clients]);

  const confirm = useCallback(async () => {
    if (!paymentData) return;
    setState(STATES.SUBMITTING);
    setError(null);

    try {
      const result = await registerPayment(
        paymentData.loanId,
        paymentData.installmentId,
        paymentData.options
      );

      if (result) {
        setReceipt(result);
        setState(STATES.PRINTING);
        return result;
      } else {
        setError('Error al registrar pago');
        setState(STATES.ERROR);
        return null;
      }
    } catch (e) {
      setError(e.message || 'Error al registrar pago');
      setState(STATES.ERROR);
      return null;
    }
  }, [paymentData, registerPayment]);

  const markPrintDone = useCallback(() => {
    setState(STATES.DONE);
  }, []);

  const reset = useCallback(() => {
    setState(STATES.IDLE);
    setPaymentData(null);
    setReceipt(null);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    state,
    paymentData,
    receipt,
    error,
    isIdle: state === STATES.IDLE,
    isCalculating: state === STATES.CALCULATING,
    isConfirming: state === STATES.CONFIRMING,
    isSubmitting: state === STATES.SUBMITTING,
    isPrinting: state === STATES.PRINTING,
    isDone: state === STATES.DONE,
    hasError: state === STATES.ERROR,
    // Actions
    calculatePayment,
    confirm,
    markPrintDone,
    reset,
    cancel,
  };
}

export { STATES as PAYMENT_STATES };
