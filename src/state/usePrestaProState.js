import { useState, useEffect, useMemo } from 'react';
import { safeLoad } from '../utils/storage';
import { generateId, generateSecurityToken } from '../utils/ids';
import { calculateSchedule } from '../utils/amortization';

export function usePrestaProState() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [printReceipt, setPrintReceipt] = useState(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [securityToken, setSecurityToken] = useState('');

  const [chatHistory, setChatHistory] = useState([]);

  const [clients, setClients] = useState(() => safeLoad('rt_clients', []));
  const [loans, setLoans] = useState(() => safeLoad('rt_loans', []));
  const [expenses, setExpenses] = useState(() => safeLoad('rt_expenses', []));
  const [requests, setRequests] = useState(() => safeLoad('rt_requests', []));
  const [notes, setNotes] = useState(() => safeLoad('rt_notes', []));
  const [receipts, setReceipts] = useState(() => safeLoad('rt_receipts', []));
  const [employees, setEmployees] = useState(() => safeLoad('rt_employees', []));
  const [routeClosings, setRouteClosings] = useState(() => safeLoad('rt_route_closings', []));

  // Selecciones actuales para navegación fluida
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  // Configuración del sistema (Ajustes generales)
  const [systemSettings, setSystemSettings] = useState(() =>
    safeLoad('rt_settings', {
      companyName: 'Presta Pro',
      mainCurrency: 'DOP',
      defaultPenaltyRate: 5,
      themeColor: 'indigo',
      enableRouteClosing: true,
      enableRouteGpsNotification: true,
      includeFutureInstallmentsInRoutes: true,
    })
  );

  // Cobradores / Gestores de cobro
  const [collectors, setCollectors] = useState(() => safeLoad('rt_collectors', []));

  // Ruta en construcción
  const [currentRouteLoanIds, setCurrentRouteLoanIds] = useState([]);
  const [routeActive, setRouteActive] = useState(false);

  const dbData = useMemo(
    () => ({ clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings }),
    [clients, loans, expenses, requests, notes, receipts, employees, collectors, systemSettings, routeClosings]
  );

  useEffect(() => localStorage.setItem('rt_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('rt_loans', JSON.stringify(loans)), [loans]);
  useEffect(() => localStorage.setItem('rt_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('rt_requests', JSON.stringify(requests)), [requests]);
  useEffect(() => localStorage.setItem('rt_notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('rt_receipts', JSON.stringify(receipts)), [receipts]);
  useEffect(() => localStorage.setItem('rt_employees', JSON.stringify(employees)), [employees]);
  useEffect(() => localStorage.setItem('rt_route_closings', JSON.stringify(routeClosings)), [routeClosings]);
  useEffect(() => localStorage.setItem('rt_settings', JSON.stringify(systemSettings)), [systemSettings]);
  useEffect(() => localStorage.setItem('rt_collectors', JSON.stringify(collectors)), [collectors]);

  const showToast = (msg, type = 'success') => {
    setShowNotification({ msg, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handlePrint = () => {
    window.print();
    setTimeout(() => setPrintReceipt(null), 1000);
  };

  const addClient = (data) => {
    setClients([...clients, { ...data, id: generateId(), score: 70, createdAt: new Date().toISOString() }]);
    showToast('Cliente registrado correctamente');
  };

  const addEmployee = (data) => {
    setEmployees([...employees, { ...data, id: generateId() }]);
    showToast('Empleado registrado correctamente');
  };

  const addCollector = (data) => {
    setCollectors([...collectors, { ...data, id: generateId() }]);
    showToast('Cobrador registrado correctamente');
  };

  const addExpense = (data) => {
    setExpenses([...expenses, { ...data, id: generateId(), date: new Date().toISOString() }]);
    showToast('Gasto registrado');
  };

  const addRequest = (data) => {
    setRequests([...requests, { ...data, id: generateId(), status: 'REVIEW', date: new Date().toISOString() }]);
    showToast('Solicitud enviada a revisión');
  };

  const createLoan = (loanData) => {
    const schedule = calculateSchedule(
      loanData.amount,
      loanData.rate,
      loanData.term,
      loanData.frequency,
      loanData.startDate
    );

    const newLoan = {
      ...loanData,
      id: generateId(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      schedule,
      totalInterest: schedule.reduce((acc, item) => acc + item.interest, 0),
      totalPaid: 0,
    };

    setLoans([newLoan, ...loans]);
    showToast('Préstamo creado exitosamente');
    setActiveTab('loans');
  };

  const approveRequest = (req) => {
    createLoan(req);
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
  };

  const rejectRequest = (req) => {
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    showToast('Solicitud rechazada', 'success');
  };

  const registerPayment = (loanId, installmentId) => {
    const loan = loans.find(l => l.id === loanId);
    const installment = loan?.schedule.find(i => i.id === installmentId);
    const client = clients.find(c => c.id === loan?.clientId);
    if (!loan || !installment || !client) return;

    const previousTotalPaid = loan.totalPaid || 0;
    const newTotalPaid = previousTotalPaid + installment.payment;
    const loanAmount = parseFloat(loan.amount || 0);
    const remainingBalance = Math.max(loanAmount - newTotalPaid, 0);

    const newReceipt = {
      id: generateId(),
      date: new Date().toISOString(),
      loanId: loan.id,
      clientId: client.id,
      clientName: client.name,
      amount: installment.payment,
      installmentNumber: installment.number,
      installmentDate: installment.date,
      clientPhone: client.phone || '',
      clientAddress: client.address || '',
      loanAmount,
      totalPaidAfter: newTotalPaid,
      remainingBalance,
    };

    setReceipts([newReceipt, ...receipts]);

    setLoans(loans.map(l => {
      if (l.id !== loanId) return l;
      const updatedSchedule = l.schedule.map(inst =>
        inst.id === installmentId
          ? { ...inst, status: 'PAID', paidAmount: inst.payment, paidDate: new Date().toISOString() }
          : inst
      );
      const allPaid = updatedSchedule.every(i => i.status === 'PAID');
      return {
        ...l,
        schedule: updatedSchedule,
        totalPaid: l.totalPaid + installment.payment,
        status: allPaid ? 'PAID' : 'ACTIVE',
      };
    }));

    setPrintReceipt(newReceipt);
    setTimeout(handlePrint, 100);
    showToast('Pago cobrado y recibo generado');
  };

  const assignCollectorToClient = (clientId, collectorId) => {
    setClients(clients.map(c => (c.id === clientId ? { ...c, collectorId } : c)));
    showToast('Ruta / cobrador asignado al cliente');
  };

  const addRouteClosing = ({ collectorId, date, totalAmount, receiptsCount }) => {
    const closing = {
      id: generateId(),
      collectorId,
      date,
      totalAmount,
      receiptsCount,
    };
    setRouteClosings([closing, ...routeClosings]);
    showToast('Cuadre del cobrador registrado correctamente');
  };

  const toggleLoanInRoute = (loanId, installmentId) => {
    const key = `${loanId}:${installmentId}`;
    setCurrentRouteLoanIds(prev =>
      prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
    );
  };

  const clearCurrentRoute = () => {
    setCurrentRouteLoanIds([]);
    setRouteActive(false);
  };

  const startRoute = () => {
    if (currentRouteLoanIds.length === 0) {
      showToast('Primero selecciona al menos un cliente/préstamo para la ruta.', 'error');
      return;
    }
    setRouteActive(true);
    if (systemSettings.enableRouteGpsNotification) {
      showToast('Ruta iniciada: GPS / navegación activada para el cobrador.', 'success');
    } else {
      showToast('Ruta iniciada.', 'success');
    }
  };

  const finishRoute = () => {
    setRouteActive(false);
  };

  return {
    // state
    activeTab,
    mobileMenuOpen,
    showNotification,
    searchQuery,
    printReceipt,
    clientModalOpen,
    employeeModalOpen,
    securityToken,
    chatHistory,
    clients,
    loans,
    expenses,
    requests,
    notes,
    receipts,
    employees,
    systemSettings,
    collectors,
    routeClosings,
    selectedClientId,
    selectedLoanId,
    currentRouteLoanIds,
    routeActive,

    // setters
    setActiveTab,
    setMobileMenuOpen,
    setShowNotification,
    setSearchQuery,
    setPrintReceipt,
    setClientModalOpen,
    setEmployeeModalOpen,
    setSecurityToken,
    setChatHistory,
    setClients,
    setLoans,
    setExpenses,
    setRequests,
    setNotes,
    setReceipts,
    setEmployees,
    setSystemSettings,
    setCollectors,
    setRouteClosings,
    setSelectedClientId,
    setSelectedLoanId,
    setCurrentRouteLoanIds,
    setRouteActive,

    // derived
    dbData,

    // actions
    showToast,
    handlePrint,
    addClient,
    addEmployee,
    addCollector,
    addExpense,
    addRequest,
    approveRequest,
    rejectRequest,
    createLoan,
    registerPayment,
    assignCollectorToClient,
    addRouteClosing,
    toggleLoanInRoute,
    clearCurrentRoute,
    startRoute,
    finishRoute,
  };
}
