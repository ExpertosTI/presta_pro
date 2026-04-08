import { useState, useCallback } from 'react';
import { calculateSchedule } from '../../../shared/utils/amortization';

/**
 * Loan request approval flow:
 * review → terms → preview → approving → done
 */
const STEPS = {
  REVIEW: 'review',
  TERMS: 'terms',
  PREVIEW: 'preview',
  APPROVING: 'approving',
  DONE: 'done',
  ERROR: 'error',
};

export function useApprovalFlow({ onApprove, onReject }) {
  const [step, setStep] = useState(STEPS.REVIEW);
  const [request, setRequest] = useState(null);
  const [terms, setTerms] = useState({ closingCosts: 0 });
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState(null);

  const startReview = useCallback((req) => {
    setRequest(req);
    setTerms({ closingCosts: 0 });
    setSchedule([]);
    setError(null);
    setStep(STEPS.REVIEW);
  }, []);

  const setLoanTerms = useCallback((newTerms) => {
    setTerms(prev => ({ ...prev, ...newTerms }));
    setStep(STEPS.TERMS);
  }, []);

  const previewSchedule = useCallback(() => {
    if (!request) return;

    const amount = parseFloat(request.amount) + (terms.closingCosts || 0);
    const rate = parseFloat(request.rate);
    const term = parseInt(request.term);
    const frequency = request.frequency || 'Mensual';
    const startDate = request.startDate || new Date().toISOString().split('T')[0];

    const computed = calculateSchedule(amount, rate, term, frequency, startDate);
    const totalInterest = computed.reduce((acc, item) => acc + item.interest, 0);
    const totalPayment = computed.reduce((acc, item) => acc + item.payment, 0);

    setSchedule(computed);
    setStep(STEPS.PREVIEW);

    return {
      schedule: computed,
      totalInterest,
      totalPayment,
      monthlyPayment: computed[0]?.payment || 0,
    };
  }, [request, terms]);

  const approve = useCallback(async () => {
    if (!request) return;
    setStep(STEPS.APPROVING);
    setError(null);

    try {
      await onApprove(request, terms.closingCosts);
      setStep(STEPS.DONE);
    } catch (e) {
      setError(e.message || 'Error al aprobar solicitud');
      setStep(STEPS.ERROR);
    }
  }, [request, terms, onApprove]);

  const reject = useCallback(async () => {
    if (!request) return;
    try {
      await onReject(request);
      setStep(STEPS.DONE);
    } catch (e) {
      setError(e.message || 'Error al rechazar solicitud');
      setStep(STEPS.ERROR);
    }
  }, [request, onReject]);

  const reset = useCallback(() => {
    setStep(STEPS.REVIEW);
    setRequest(null);
    setTerms({ closingCosts: 0 });
    setSchedule([]);
    setError(null);
  }, []);

  return {
    step,
    request,
    terms,
    schedule,
    error,
    isReview: step === STEPS.REVIEW,
    isTerms: step === STEPS.TERMS,
    isPreview: step === STEPS.PREVIEW,
    isApproving: step === STEPS.APPROVING,
    isDone: step === STEPS.DONE,
    hasError: step === STEPS.ERROR,
    // Actions
    startReview,
    setLoanTerms,
    previewSchedule,
    approve,
    reject,
    reset,
  };
}

export { STEPS as APPROVAL_STEPS };
