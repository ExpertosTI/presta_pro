import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { clientService, loanService, paymentService, expenseService, collectorService, employeeService, settingsService } from '../services/api';
import { generateId } from '../shared/utils/ids';
import { formatCurrency } from '../shared/utils/formatters';
import { calculateSchedule } from '../shared/utils/amortization';
import { useToast } from '../shared/components/ui/Toast';

const AppDataContext = createContext(null);

const INITIAL_DB_DATA = {
  clients: [],
  loans: [],
  expenses: [],
  receipts: [],
  requests: [],
  notes: [],
  employees: [],
  collectors: [],
  routes: [],
  routeClosings: [],
  routeActive: false,
  clientDocuments: {},
  goals: { monthly: 500000, daily: 15000 },
  systemSettings: {
    companyName: 'Presta Pro',
    currency: 'DOP',
    allowLatePayments: true,
    interestMethod: 'simple',
    themeColor: 'indigo',
    companyLogo: '',
    ownerDisplayName: '',
  }
};

function buildInitialData() {
  const savedSettings = localStorage.getItem('systemSettings');
  const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
  return {
    ...INITIAL_DB_DATA,
    systemSettings: {
      ...INITIAL_DB_DATA.systemSettings,
      ...parsedSettings
    }
  };
}

export function AppDataProvider({ children, token, user }) {
  const showToastFn = useToast();
  const [dbData, setDbData] = useState(buildInitialData);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    if (type === 'error') {
      addNotification(message, 'error');
    }
    showToastFn?.(message, type);
  }, [showToastFn]);

  const addNotification = useCallback((text, type = 'info') => {
    setNotifications(prev => [{ id: generateId(), text, type, date: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  // --- Derived State ---
  const pendingRequestsCount = useMemo(() =>
    dbData.requests.filter(r => r.status === 'REVIEW').length,
    [dbData.requests]);

  const activeLoansCount = useMemo(() =>
    dbData.loans.filter(l => l.status === 'ACTIVE').length,
    [dbData.loans]);

  // --- Data Loading ---
  const loadServerData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [clients, loans, payments, expensesRes, employeesRes, collectorsRes, settingsRes] = await Promise.all([
        clientService.getAll(),
        loanService.getAll(),
        paymentService.getAll(),
        expenseService.getAll(),
        employeeService.getAll(),
        collectorService.getAll(),
        settingsService.get(),
      ]);

      const settings = settingsRes || { companyName: 'Presta Pro' };

      setDbData(prev => ({
        ...prev,
        clients: Array.isArray(clients) ? clients : [],
        loans: Array.isArray(loans) ? loans : [],
        receipts: Array.isArray(payments) ? payments : [],
        expenses: Array.isArray(expensesRes) ? expensesRes : [],
        employees: Array.isArray(employeesRes) ? employeesRes : [],
        collectors: Array.isArray(collectorsRes) ? collectorsRes : [],
        systemSettings: {
          ...prev.systemSettings,
          ...settings
        }
      }));
    } catch (err) {
      console.error("Error loading data:", err);
      showToast("Error conectando con el servidor", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (token) loadServerData();
  }, [token, loadServerData]);

  // --- CRUD Handlers ---

  const registerPayment = useCallback(async (loanId, installmentId, options) => {
    try {
      const loan = dbData.loans.find(l => l.id === loanId);
      const client = dbData.clients.find(c => c.id === loan?.clientId);
      const schedule = loan?.schedule || loan?.installments || [];

      const pendingInstallments = schedule
        .filter(s => s.status !== 'PAID')
        .sort((a, b) => (a.number || 0) - (b.number || 0));

      const firstInstallment = pendingInstallments.find(s => s.id === installmentId) || pendingInstallments[0];
      const paymentAmount = options?.customAmount || firstInstallment?.payment || 0;
      const penaltyAmount = options?.penaltyAmount || 0;

      const installmentPaymentAmount = firstInstallment?.payment || paymentAmount;
      const paymentBreakdown = [];
      let remainingPayment = paymentAmount;
      const paidInstallmentIds = [];
      const partialPaymentInstallments = [];

      for (const inst of pendingInstallments) {
        if (remainingPayment <= 0) break;

        const previouslyPaid = inst.paidAmount || 0;
        const stillOwed = (inst.payment || installmentPaymentAmount) - previouslyPaid;
        const amountForThisInstallment = Math.min(remainingPayment, stillOwed);
        const isFullPayment = amountForThisInstallment >= stillOwed - 0.01;

        paymentBreakdown.push({
          number: inst.number,
          id: inst.id,
          amount: amountForThisInstallment,
          date: new Date().toISOString(),
          isPartialPayment: !isFullPayment,
          previouslyPaid,
          totalInstallmentAmount: inst.payment
        });

        if (isFullPayment) {
          paidInstallmentIds.push(inst.id);
        } else {
          partialPaymentInstallments.push({
            id: inst.id,
            amountPaid: amountForThisInstallment,
            newTotalPaid: previouslyPaid + amountForThisInstallment
          });
        }
        remainingPayment -= amountForThisInstallment;
        if (remainingPayment < 1) break;
      }

      const hasPartialPayments = partialPaymentInstallments.length > 0;
      const isOnlyPartialPayment = hasPartialPayments && paidInstallmentIds.length === 0;

      const paymentData = {
        loanId,
        installmentId: firstInstallment?.id || installmentId,
        installmentNumber: firstInstallment?.number || options?.installmentNumber || 1,
        amount: paymentAmount,
        penaltyAmount,
        installmentsPaid: paymentBreakdown.length,
        isPartialPayment: isOnlyPartialPayment,
        ...options
      };

      const serverReceipt = await paymentService.create(paymentData);

      const totalPaidBefore = loan?.totalPaid || 0;
      const newTotalPaid = totalPaidBefore + paymentAmount + penaltyAmount;
      const remainingBalance = Math.max(0, (loan?.amount || 0) + (loan?.totalInterest || 0) - newTotalPaid);

      const enrichedReceipt = {
        ...serverReceipt,
        id: serverReceipt?.id || generateId(),
        clientId: loan?.clientId,
        clientName: client?.name || 'Cliente',
        clientPhone: client?.phone || '',
        loanId,
        amount: paymentAmount,
        penaltyAmount,
        installmentNumber: paymentBreakdown.length > 1
          ? `${paymentBreakdown[0].number}-${paymentBreakdown[paymentBreakdown.length - 1].number}`
          : (firstInstallment?.number || 1),
        date: serverReceipt?.date || new Date().toISOString(),
        loanAmount: loan?.amount,
        remainingBalance,
        paymentBreakdown,
        installmentsPaidCount: paidInstallmentIds.length,
        isPartialPayment: isOnlyPartialPayment,
        partialPaymentToInstallment: isOnlyPartialPayment ? firstInstallment?.number : null,
        concept: isOnlyPartialPayment
          ? `Abono a Cuota #${firstInstallment?.number}`
          : (paymentBreakdown.length > 1
            ? `Cuotas #${paymentBreakdown[0].number}-${paymentBreakdown[paymentBreakdown.length - 1].number}`
            : `Cuota #${firstInstallment?.number}`)
      };

      setDbData(prev => ({
        ...prev,
        receipts: [...prev.receipts, enrichedReceipt],
        loans: prev.loans.map(l => l.id === loanId ? {
          ...l,
          totalPaid: newTotalPaid,
          schedule: (l.schedule || []).map(s => {
            if (paidInstallmentIds.includes(s.id)) {
              return { ...s, status: 'PAID', paidDate: new Date(), paidAmount: s.payment };
            }
            const partialInfo = partialPaymentInstallments.find(p => p.id === s.id);
            if (partialInfo) {
              return { ...s, paidAmount: partialInfo.newTotalPaid, status: 'PARTIAL' };
            }
            return s;
          })
        } : l)
      }));

      const cuotasMsg = paymentBreakdown.length > 1
        ? `Pago registrado (${paymentBreakdown.length} cuotas)`
        : "Pago registrado";
      showToast(cuotasMsg, "success");
      return enrichedReceipt;
    } catch (e) {
      console.error('registerPayment error:', e);
      showToast(e.message || 'Error al registrar pago', "error");
      return null;
    }
  }, [dbData.loans, dbData.clients, showToast]);

  const addRequest = useCallback((req) => {
    const newReq = { ...req, id: generateId(), status: 'REVIEW', createdAt: new Date().toISOString() };
    setDbData(p => ({ ...p, requests: [...p.requests, newReq] }));
    const client = dbData.clients.find(c => c.id === req.clientId);
    addNotification(`Nueva solicitud de ${client?.name || 'cliente'} por ${formatCurrency(req.amount)}`, 'info');
  }, [dbData.clients, addNotification]);

  const approveRequest = useCallback(async (req, closingCosts = 0) => {
    try {
      const amount = parseFloat(req.amount);
      const rate = parseFloat(req.rate);
      const term = parseInt(req.term);
      const frequency = req.frequency || 'Mensual';
      const startDate = req.startDate || new Date().toISOString().split('T')[0];

      const totalForSchedule = amount + closingCosts;
      const schedule = calculateSchedule(totalForSchedule, rate, term, frequency, startDate);
      const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

      const newLoan = await loanService.create({
        clientId: req.clientId, amount, closingCosts, rate, term, frequency, startDate, schedule, totalInterest
      });

      setDbData(p => ({
        ...p,
        requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r),
        loans: [...p.loans, { ...newLoan, schedule: newLoan.installments || schedule }]
      }));
      showToast('Solicitud aprobada y préstamo creado', 'success');
      addNotification('Préstamo creado desde solicitud #' + (req?.id?.slice(0, 4) || ''), 'success');
    } catch (error) {
      console.error('Error creating loan:', error);
      showToast('Error al crear préstamo en servidor - guardado localmente', 'error');

      const amount = parseFloat(req.amount);
      const rate = parseFloat(req.rate);
      const term = parseInt(req.term);
      const frequency = req.frequency || 'Mensual';
      const startDate = req.startDate || new Date().toISOString().split('T')[0];
      const schedule = calculateSchedule(amount, rate, term, frequency, startDate);
      const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

      const newLoan = {
        id: generateId(), clientId: req.clientId, amount, rate, term, frequency, startDate,
        status: 'ACTIVE', createdAt: new Date().toISOString(), schedule, totalInterest, totalPaid: 0
      };

      setDbData(p => ({
        ...p,
        requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r),
        loans: [...p.loans, newLoan]
      }));
    }
  }, [showToast, addNotification]);

  const rejectRequest = useCallback((req) => {
    setDbData(p => ({
      ...p,
      requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r)
    }));
    showToast('Solicitud rechazada', 'info');
  }, [showToast]);

  const handleAddClientDocument = useCallback(async (clientId, doc) => {
    try {
      const savedDoc = await clientService.uploadDocument(clientId, doc);
      const newDoc = savedDoc.data || savedDoc;
      setDbData(p => ({
        ...p,
        clients: p.clients.map(c => c.id === clientId ? {
          ...c,
          documents: [...(c.documents || []), newDoc]
        } : c)
      }));
      showToast('Documento guardado correctamente', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al guardar documento', 'error');
    }
  }, [showToast]);

  const addExpense = useCallback(async (exp) => {
    try {
      const newExp = await expenseService.create(exp);
      setDbData(p => ({ ...p, expenses: [...p.expenses, newExp] }));
      showToast('Gasto registrado', 'success');
    } catch (e) {
      console.error('addExpense error:', e);
      const localExp = { ...exp, id: generateId(), date: new Date().toISOString() };
      setDbData(p => ({ ...p, expenses: [...p.expenses, localExp] }));
      showToast('Gasto guardado localmente', 'warning');
    }
  }, [showToast]);

  const deleteExpense = useCallback(async (id) => {
    try {
      await expenseService.delete(id);
      setDbData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }));
      showToast('Gasto eliminado', 'success');
    } catch (err) {
      console.error('Delete expense error:', err);
      setDbData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }));
      showToast('Gasto eliminado localmente', 'warning');
    }
  }, [showToast]);

  const addCollector = useCallback(async (c) => {
    try {
      const newC = await collectorService.create(c);
      setDbData(p => ({ ...p, collectors: [...p.collectors, newC] }));
      showToast('Cobrador agregado', 'success');
    } catch (e) {
      console.error('addCollector error:', e);
      const localC = { ...c, id: generateId() };
      setDbData(p => ({ ...p, collectors: [...p.collectors, localC] }));
      showToast('Cobrador guardado localmente', 'warning');
    }
  }, [showToast]);

  const updateCollector = useCallback(async (c) => {
    try {
      await collectorService.update(c.id, c);
      setDbData(p => ({ ...p, collectors: p.collectors.map(col => col.id === c.id ? { ...col, ...c } : col) }));
    } catch (e) {
      console.error('updateCollector error:', e);
      setDbData(p => ({ ...p, collectors: p.collectors.map(col => col.id === c.id ? { ...col, ...c } : col) }));
    }
  }, []);

  const removeCollector = useCallback(async (id) => {
    try {
      await collectorService.delete(id);
      setDbData(p => ({ ...p, collectors: p.collectors.filter(c => c.id !== id) }));
      showToast('Cobrador eliminado', 'success');
    } catch (e) {
      console.error('removeCollector error:', e);
      setDbData(p => ({ ...p, collectors: p.collectors.filter(c => c.id !== id) }));
    }
  }, [showToast]);

  const assignCollectorToClient = useCallback(async (clientId, collectorId) => {
    try {
      await clientService.update(clientId, { collectorId });
      setDbData(p => ({ ...p, clients: p.clients.map(c => c.id === clientId ? { ...c, collectorId } : c) }));
      showToast('Cliente asignado a ruta', 'success');
    } catch (e) {
      console.error('assignCollectorToClient error:', e);
      setDbData(p => ({ ...p, clients: p.clients.map(c => c.id === clientId ? { ...c, collectorId } : c) }));
      showToast('Asignado localmente', 'warning');
    }
  }, [showToast]);

  const createLoan = useCallback(async (loanData) => {
    try {
      const newLoan = await loanService.create(loanData);
      setDbData(p => ({
        ...p,
        loans: [...p.loans, { ...newLoan, schedule: newLoan.installments || [] }]
      }));
      showToast('Préstamo creado exitosamente', 'success');
    } catch (e) {
      console.error('Create loan error:', e);
      showToast(e.message || 'Error al crear préstamo', 'error');
    }
  }, [showToast]);

  const updateLoan = useCallback((loan) => {
    setDbData(p => ({ ...p, loans: p.loans.map(l => l.id === loan.id ? loan : l) }));
    showToast('Préstamo actualizado', 'success');
  }, [showToast]);

  const updateClient = useCallback(async (client) => {
    if (client.collectorId !== undefined) {
      await assignCollectorToClient(client.id, client.collectorId);
    } else {
      try {
        await clientService.update(client.id, client);
        setDbData(p => ({ ...p, clients: p.clients.map(c => c.id === client.id ? { ...c, ...client } : c) }));
        showToast('Cliente actualizado', 'success');
      } catch (e) {
        console.error('Update client error:', e);
        showToast('Error al actualizar cliente', 'error');
      }
    }
  }, [showToast, assignCollectorToClient]);

  const deleteClient = useCallback(async (item) => {
    try {
      await clientService.delete(item.id);
      setDbData(p => ({ ...p, clients: p.clients.filter(c => c.id !== item.id) }));
      showToast('Cliente eliminado', 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error eliminando cliente', 'error');
    }
  }, [showToast]);

  const deleteEmployee = useCallback(async (item) => {
    try {
      await employeeService.delete(item.id);
      setDbData(p => ({ ...p, employees: p.employees.filter(e => e.id !== item.id) }));
      showToast('Empleado eliminado', 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error eliminando empleado', 'error');
    }
  }, [showToast]);

  const saveClient = useCallback(async (clientData, editingClient, callback) => {
    try {
      if (editingClient) {
        const updated = await clientService.update(editingClient.id, clientData);
        setDbData(p => ({ ...p, clients: p.clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c) }));
        showToast('Cliente actualizado', 'success');
      } else {
        const newClient = await clientService.create(clientData);
        setDbData(p => ({ ...p, clients: [...p.clients, newClient] }));
        showToast('Cliente creado', 'success');
        if (callback) callback(newClient.id);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error al guardar cliente', 'error');
      if (!editingClient) {
        const newClientId = generateId();
        const newClient = { ...clientData, id: newClientId };
        setDbData(p => ({ ...p, clients: [...p.clients, newClient] }));
        if (callback) callback(newClientId);
      }
    }
  }, [showToast]);

  const saveEmployee = useCallback(async (employeeData, editingEmployee) => {
    try {
      if (editingEmployee) {
        const updated = await employeeService.update(editingEmployee.id, employeeData);
        setDbData(p => {
          const updatedEmployees = p.employees.map(e => e.id === editingEmployee.id ? { ...e, ...updated } : e);
          let updatedCollectors = [...p.collectors];
          const wasCollector = editingEmployee.role?.toLowerCase() === 'cobrador';
          const isNowCollector = employeeData.role?.toLowerCase() === 'cobrador';

          if (!wasCollector && isNowCollector) {
            collectorService.create({ name: updated.name, phone: updated.phone || '' });
            updatedCollectors.push({ id: updated.id, name: updated.name, phone: updated.phone || '' });
          } else if (wasCollector && !isNowCollector) {
            const collector = p.collectors.find(c => c.name === editingEmployee.name);
            if (collector) collectorService.delete(collector.id);
            updatedCollectors = updatedCollectors.filter(c => c.name !== editingEmployee.name);
          } else if (isNowCollector) {
            updatedCollectors = updatedCollectors.map(c => c.name === editingEmployee.name ? { ...c, name: updated.name, phone: updated.phone || '' } : c);
          }

          return { ...p, employees: updatedEmployees, collectors: updatedCollectors };
        });
        showToast('Empleado actualizado', 'success');
      } else {
        const newEmployee = await employeeService.create(employeeData);
        setDbData(p => {
          const newState = { ...p, employees: [...p.employees, newEmployee] };
          if (employeeData.role?.toLowerCase() === 'cobrador') {
            collectorService.create({ name: newEmployee.name, phone: newEmployee.phone || '' }).then(newCollector => {
              setDbData(prev => ({ ...prev, collectors: [...prev.collectors, newCollector] }));
            });
          }
          return newState;
        });
        showToast('Empleado creado', 'success');
        if (employeeData.role?.toLowerCase() === 'cobrador') {
          showToast('Agregado a cobradores automáticamente', 'info');
        }
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast('Error al guardar empleado', 'error');
    }
  }, [showToast]);

  const setSystemSettings = useCallback((s) => {
    setDbData(p => ({ ...p, systemSettings: { ...p.systemSettings, ...s } }));
  }, []);

  // Route management
  const toggleLoanInRoute = useCallback((loanId, installmentId) => {
    setDbData(p => {
      const routes = p.routes || [];
      const routeKey = installmentId ? `${loanId}:${installmentId}` : loanId;
      const exists = routes.includes(routeKey);
      return { ...p, routes: exists ? routes.filter(id => id !== routeKey) : [...routes, routeKey] };
    });
  }, []);

  const clearCurrentRoute = useCallback(() => setDbData(p => ({ ...p, routes: [] })), []);
  const startRoute = useCallback(() => setDbData(p => ({ ...p, routeActive: true })), []);
  const finishRoute = useCallback(() => setDbData(p => ({ ...p, routeActive: false })), []);
  const addRouteClosing = useCallback((closing) => setDbData(p => ({ ...p, routeClosings: [...(p.routeClosings || []), closing] })), []);

  const value = useMemo(() => ({
    dbData,
    setDbData,
    loading,
    notifications,
    setNotifications,
    showToast,
    addNotification,
    loadServerData,
    user,
    // Derived
    pendingRequestsCount,
    activeLoansCount,
    // CRUD
    registerPayment,
    addRequest,
    approveRequest,
    rejectRequest,
    handleAddClientDocument,
    addExpense,
    deleteExpense,
    addCollector,
    updateCollector,
    removeCollector,
    assignCollectorToClient,
    createLoan,
    updateLoan,
    updateClient,
    deleteClient,
    deleteEmployee,
    saveClient,
    saveEmployee,
    setSystemSettings,
    // Routes
    toggleLoanInRoute,
    clearCurrentRoute,
    startRoute,
    finishRoute,
    addRouteClosing,
  }), [
    dbData, loading, notifications, showToast, addNotification, loadServerData, user,
    pendingRequestsCount, activeLoansCount,
    registerPayment, addRequest, approveRequest, rejectRequest, handleAddClientDocument,
    addExpense, deleteExpense, addCollector, updateCollector, removeCollector,
    assignCollectorToClient, createLoan, updateLoan, updateClient, deleteClient,
    deleteEmployee, saveClient, saveEmployee, setSystemSettings,
    toggleLoanInRoute, clearCurrentRoute, startRoute, finishRoute, addRouteClosing,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export default AppDataContext;
