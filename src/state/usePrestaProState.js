import { useDataState } from './useDataState';
import { useUIState } from './useUIState';
import { useAuth } from './useAuth';
import { ROLES } from '../logic/authLogic';

export function usePrestaProState() {
  const ui = useUIState();
  const data = useDataState();
  const auth = useAuth(data.collectors, data.systemSettings, data.addCollector);

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
    const receipt = data.registerPayment(loanId, installmentId, options);
    if (receipt) {
      ui.setPrintReceipt(receipt);
      setTimeout(ui.handlePrint, 100);
      ui.showToast('Pago cobrado y recibo generado');
    }
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
    data.createLoan(loanData);
    ui.showToast('Préstamo creado exitosamente');
    ui.setActiveTab('loans');
  };

  // Wrapper for add functions to show toast
  const addClient = (d) => { data.addClient(d); ui.showToast('Cliente registrado correctamente'); };
  const addEmployee = (d) => { data.addEmployee(d); ui.showToast('Empleado registrado correctamente'); };
  const addCollector = (d) => { data.addCollector(d); ui.showToast('Cobrador registrado correctamente'); };
  const addExpense = (d) => { data.addExpense(d); ui.showToast('Gasto registrado'); };
  const addRequest = (d) => { data.addRequest(d); ui.showToast('Solicitud enviada a revisión'); };
  const updateClient = (d) => { data.updateClient(d); ui.showToast('Cliente actualizado correctamente'); };
  const updateLoan = (d) => { data.updateLoan(d); ui.showToast('Préstamo actualizado correctamente'); };
  const rejectRequest = (d) => { data.rejectRequest(d); ui.showToast('Solicitud rechazada', 'success'); };
  const assignCollectorToClient = (cid, colid) => { data.assignCollectorToClient(cid, colid); ui.showToast('Ruta / cobrador asignado al cliente'); };
  const addRouteClosing = (d) => { data.addRouteClosing(d); ui.showToast('Cuadre del cobrador registrado correctamente'); };

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
    addExpense,
    addRequest,
    rejectRequest,
    assignCollectorToClient,
    addRouteClosing,
    updateLoan
  };
}
