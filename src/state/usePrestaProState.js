import { useEffect, useRef } from 'react';
import { useDataState } from './useDataState';
import { useUIState } from './useUIState';
import { useAuth } from './useAuth';
import { ROLES } from '../logic/authLogic';

export function usePrestaProState() {
  const ui = useUIState();
  const data = useDataState();
  const auth = useAuth(data.collectors, data.systemSettings, data.addCollector);

  const prevTenantIdRef = useRef(null);

  useEffect(() => {
    const currentTenantId = auth.user?.tenantId || null;
    const prevTenantId = prevTenantIdRef.current;

    if (currentTenantId && currentTenantId !== prevTenantId) {
      try {
        // Limpiar datos locales en memoria
        if (data.resetDataForNewTenant) {
          data.resetDataForNewTenant();
        }

        // Limpiar cache localStorage ligada a datos operativos
        try {
          const keys = [
            'rt_loans',
            'rt_expenses',
            'rt_requests',
            'rt_notes',
            'rt_receipts',
            'rt_employees',
            'rt_route_closings',
            'rt_collectors',
            'rt_client_documents',
          ];
          keys.forEach((k) => localStorage.removeItem(k));
        } catch (e) {
          console.error('Error clearing tenant local data', e);
        }

        // Recargar datos remotos del nuevo tenant
        const token = auth.user?.token;
        if (token) {
          if (data.loadClients) data.loadClients(token);
          if (data.loadCollectors) data.loadCollectors(token);
          if (data.loadLoans) data.loadLoans(token);
          if (data.loadAiMetrics) data.loadAiMetrics(token);
        }
      } catch (e) {
        console.error('Error resetting data for new tenant', e);
      }
    }

    prevTenantIdRef.current = currentTenantId;
  }, [auth.user?.tenantId, auth.user?.token, data]);

  // Filter data based on Role
  const filteredClients = auth.user?.role === ROLES.COLLECTOR
    ? data.clients.filter(c => c.collectorId === auth.user.collectorId)
    : data.clients;

  const filteredLoans = auth.user?.role === ROLES.COLLECTOR
    ? data.loans.filter(l => {
      const client = data.clients.find(c => c.id === l.clientId);
      return client?.collectorId === auth.user.collectorId;
    })
    : data.loans;

  // Wrapper for registerPayment to handle UI side effects (print receipt, toast)
  const registerPayment = (loanId, installmentId, options = {}) => {
    const receipt = data.registerPayment(loanId, installmentId, options, auth.user?.token);
    if (receipt) {
      if (!options.suppressAutoPrint) {
        ui.setPrintReceipt(receipt);
        setTimeout(ui.handlePrint, 100);
      }
      ui.showToast('Pago cobrado y recibo generado');
    }
    return receipt;
  };

  // Wrapper for startRoute to handle UI side effects
  const startRoute = () => {
    if (ui.currentRouteLoanIds.length === 0) {
      ui.showToast('Primero selecciona al menos un cliente/préstamo para la ruta.', 'error');
      return;
    }
    ui.setRouteActive(true);
    if (data.systemSettings.enableRouteGpsNotification) {
      ui.showToast('Ruta iniciada: GPS / navegación activada para el cobrador.', 'success');
    } else {
      ui.showToast('Ruta iniciada.', 'success');
    }
  };

  const finishRoute = () => {
    ui.setRouteActive(false);
  };

  // Wrapper for createLoan to handle UI side effects
  const createLoan = (loanData) => {
    data.createLoan(loanData, auth.user?.token);
    ui.showToast('Préstamo creado exitosamente');
    ui.setActiveTab('loans');
  };

  // Wrapper for add functions to show toast
  const addClient = (d) => { data.addClient(d, auth.user?.token); ui.showToast('Cliente registrado correctamente'); };
  const addEmployee = (d) => { data.addEmployee(d); ui.showToast('Empleado registrado correctamente'); };
  const addCollector = (d) => { data.addCollector(d, auth.user?.token); ui.showToast('Cobrador registrado correctamente'); };
  const updateCollector = (d) => { data.updateCollector(d, auth.user?.token); ui.showToast('Cobrador actualizado correctamente'); };
  const removeCollector = (id) => { data.removeCollector(id, auth.user?.token); ui.showToast('Cobrador eliminado'); };
  const addExpense = (d) => { data.addExpense(d); ui.showToast('Gasto registrado'); };
  const addRequest = (d) => { data.addRequest(d); ui.showToast('Solicitud enviada a revisión'); };
  const approveRequest = (d) => { data.approveRequest(d, auth.user?.token); ui.showToast('Solicitud aprobada y préstamo creado', 'success'); };
  const updateClient = (d) => { data.updateClient(d); ui.showToast('Cliente actualizado correctamente'); };
  const updateLoan = (d) => { data.updateLoan(d, auth.user?.token); ui.showToast('Préstamo actualizado correctamente'); };
  const rejectRequest = (d) => { data.rejectRequest(d); ui.showToast('Solicitud rechazada', 'success'); };
  const assignCollectorToClient = (cid, colid) => { data.assignCollectorToClient(cid, colid, auth.user?.token); ui.showToast('Ruta / cobrador asignado al cliente'); };
  const addRouteClosing = (d) => { data.addRouteClosing(d); ui.showToast('Cuadre del cobrador registrado correctamente'); };

  const addClientDocument = (clientId, doc) => {
    if (!clientId || !doc) return;
    if (data.addClientDocument) {
      data.addClientDocument(clientId, doc);
    }
    ui.showToast('Documento guardado en la ficha del cliente');
  };

  return {
    ...ui,
    ...data,
    // Override data with filtered versions for UI consumption
    clients: filteredClients,
    loans: filteredLoans,
    // Expose Auth
    auth,

    registerPayment,
    startRoute,
    finishRoute,
    createLoan,
    addClient,
    updateClient,
    addEmployee,
    addCollector,
    updateCollector,
    removeCollector,
    addExpense,
    addRequest,
    approveRequest,
    rejectRequest,
    assignCollectorToClient,
    addRouteClosing,
    updateLoan,
    addClientDocument
  };
}
