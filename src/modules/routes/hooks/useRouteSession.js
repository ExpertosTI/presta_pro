import { useState, useCallback, useMemo } from 'react';

/**
 * Route session lifecycle:
 * idle → building → active → closing → closed
 */
const PHASES = {
  IDLE: 'idle',
  BUILDING: 'building',
  ACTIVE: 'active',
  CLOSING: 'closing',
  CLOSED: 'closed',
};

export function useRouteSession({
  loans, clients, receipts, collectors,
  toggleLoanInRoute, clearCurrentRoute, startRoute, finishRoute,
  addRouteClosing, registerPayment, showToast,
  currentRouteLoanIds, routeActive,
}) {
  const [phase, setPhase] = useState(routeActive ? PHASES.ACTIVE : PHASES.IDLE);
  const [closingSummary, setClosingSummary] = useState(null);

  // Derived: loans in current route
  const routeLoans = useMemo(() => {
    if (!currentRouteLoanIds?.length) return [];
    return currentRouteLoanIds.map(key => {
      const [loanId] = key.split(':');
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return null;
      const client = clients.find(c => c.id === loan.clientId);
      return { ...loan, client, routeKey: key };
    }).filter(Boolean);
  }, [currentRouteLoanIds, loans, clients]);

  const routeStats = useMemo(() => {
    const collected = routeLoans.reduce((sum, loan) => {
      const todayReceipts = (receipts || []).filter(r =>
        r.loanId === loan.id &&
        new Date(r.date).toDateString() === new Date().toDateString()
      );
      return sum + todayReceipts.reduce((s, r) => s + (r.amount || 0), 0);
    }, 0);

    return {
      totalLoans: routeLoans.length,
      collected,
      pending: routeLoans.length, // simplified
    };
  }, [routeLoans, receipts]);

  const begin = useCallback(() => {
    if (currentRouteLoanIds?.length === 0) {
      showToast('Agrega préstamos a la ruta primero', 'warning');
      return;
    }
    startRoute();
    setPhase(PHASES.ACTIVE);
    showToast('Ruta de cobros iniciada', 'success');
  }, [currentRouteLoanIds, startRoute, showToast]);

  const addToRoute = useCallback((loanId, installmentId) => {
    toggleLoanInRoute(loanId, installmentId);
  }, [toggleLoanInRoute]);

  const removeFromRoute = useCallback((loanId, installmentId) => {
    toggleLoanInRoute(loanId, installmentId);
  }, [toggleLoanInRoute]);

  const collectPayment = useCallback(async (loanId, installmentId, options) => {
    return await registerPayment(loanId, installmentId, options);
  }, [registerPayment]);

  const startClosing = useCallback(() => {
    setPhase(PHASES.CLOSING);

    const summary = {
      date: new Date().toISOString(),
      loansVisited: routeLoans.length,
      ...routeStats,
    };
    setClosingSummary(summary);
    return summary;
  }, [routeLoans, routeStats]);

  const close = useCallback((closingData = {}) => {
    const closing = {
      ...closingSummary,
      ...closingData,
      closedAt: new Date().toISOString(),
    };

    addRouteClosing(closing);
    finishRoute();
    clearCurrentRoute();
    setPhase(PHASES.CLOSED);
    setClosingSummary(null);
    showToast('Ruta cerrada exitosamente', 'success');
    return closing;
  }, [closingSummary, addRouteClosing, finishRoute, clearCurrentRoute, showToast]);

  const reset = useCallback(() => {
    clearCurrentRoute();
    finishRoute();
    setPhase(PHASES.IDLE);
    setClosingSummary(null);
  }, [clearCurrentRoute, finishRoute]);

  return {
    phase,
    routeLoans,
    routeStats,
    closingSummary,
    isIdle: phase === PHASES.IDLE,
    isBuilding: phase === PHASES.BUILDING,
    isActive: phase === PHASES.ACTIVE,
    isClosing: phase === PHASES.CLOSING,
    isClosed: phase === PHASES.CLOSED,
    // Actions
    begin,
    addToRoute,
    removeFromRoute,
    collectPayment,
    startClosing,
    close,
    reset,
  };
}

export { PHASES as ROUTE_PHASES };
