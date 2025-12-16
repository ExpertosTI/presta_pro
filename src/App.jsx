import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  PieChart,
  Settings,
  LogOut,
  Menu,
  FileText,
  Calculator,
  BrainCircuit,
  MapPin,
  FileDigit,
  UserCheck,
  Bell,
  X,
  CreditCard,
  Rocket,
  Shield
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Services
import { clientService, loanService, paymentService, syncService, settingsService, expenseService, collectorService, employeeService, noteService } from './services/api';

// Utilities
import { generateId, generateSecurityToken } from './shared/utils/ids';
import { formatCurrency, formatDate, formatDateTime } from './shared/utils/formatters';
import { calculateSchedule } from './shared/utils/amortization';

// Components
import Sidebar from './shared/components/layout/Sidebar';
import Header from './shared/components/layout/Header';
import { ClientModal } from './modules/clients';
import { EmployeeModal } from './modules/employees';
import PaymentTicket from './shared/components/ui/PaymentTicket';
import { BottomNav } from './shared/components/layout/BottomNav';
import FloatingAIBot from './ai/FloatingAIBot';

// Views (Lazy Loaded)
const DashboardView = React.lazy(() => import('./modules/dashboard').then(module => ({ default: module.DashboardView })));
const CuadreView = React.lazy(() => import('./modules/accounting').then(module => ({ default: module.CuadreView })));
const ClientsView = React.lazy(() => import('./modules/clients').then(module => ({ default: module.ClientsView })));
const LoansView = React.lazy(() => import('./modules/loans').then(module => ({ default: module.LoansView })));
const ExpensesView = React.lazy(() => import('./modules/expenses').then(module => ({ default: module.ExpensesView })));
const RequestsView = React.lazy(() => import('./modules/requests').then(module => ({ default: module.RequestsView })));
const RoutesView = React.lazy(() => import('./modules/routes').then(module => ({ default: module.RoutesView })));
const NotesView = React.lazy(() => import('./modules/notes').then(module => ({ default: module.NotesView })));
// ReportsView removed - module not in use
const PricingView = React.lazy(() => import('./modules/settings').then(module => ({ default: module.PricingView })));
const SettingsView = React.lazy(() => import('./modules/settings').then(module => ({ default: module.SettingsView })));
const DocumentsView = React.lazy(() => import('./modules/documents').then(module => ({ default: module.DocumentsView })));
const HRView = React.lazy(() => import('./modules/employees').then(module => ({ default: module.HRView })));
const AccountingView = React.lazy(() => import('./modules/accounting').then(module => ({ default: module.AccountingView })));
const AIView = React.lazy(() => import('./modules/ai').then(module => ({ default: module.AIView })));
const CalculatorView = React.lazy(() => import('./modules/tools').then(module => ({ default: module.CalculatorView })));

// New Modules
const NotificationsView = React.lazy(() => import('./modules/notifications').then(module => ({ default: module.NotificationsView })));
const CollectorsModule = React.lazy(() => import('./modules/collectors').then(module => ({ default: module.CollectorsView }))); // Renamed to avoid confusion if needed
const AdminDashboard = React.lazy(() => import('./modules/admin').then(module => ({ default: module.AdminDashboard })));
const SubscriptionDashboard = React.lazy(() => import('./modules/subscriptions').then(module => ({ default: module.SubscriptionDashboard })));

// Login View
import { LoginView } from './modules/auth';

// --- Inline Components for Layout (MenuItem, MenuSection) ---
const MenuItem = ({ icon: Icon, label, id, activeTab, onClick, badge }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-all ${activeTab === id
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge && (
      <span className="bg-blue-500/20 text-blue-200 text-xs px-2 py-0.5 rounded-full border border-blue-500/30">
        {badge}
      </span>
    )}
  </button>
);

const MenuSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-3">{title}</h3>
    {children}
  </div>
);

// --- Main App Component ---

function App() {
  // --- State ---
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [clientCreatedCallback, setClientCreatedCallback] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { type: 'client'|'employee', item: object }

  // Data State - load systemSettings from localStorage if available
  const [dbData, setDbData] = useState(() => {
    const savedSettings = localStorage.getItem('systemSettings');
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
    return {
      clients: [],
      loans: [],
      expenses: [],
      receipts: [],
      requests: [],
      notes: [],
      employees: [],
      collectors: [],
      routes: [],
      clientDocuments: {},
      goals: { monthly: 500000, daily: 15000 },
      systemSettings: {
        companyName: parsedSettings.companyName || 'Presta Pro',
        currency: 'DOP',
        allowLatePayments: true,
        interestMethod: 'simple',
        themeColor: parsedSettings.themeColor || 'indigo',
        companyLogo: parsedSettings.companyLogo || '',
        ownerDisplayName: parsedSettings.ownerDisplayName || '',
        ...parsedSettings
      }
    };
  });

  // Derived State (for UI badges etc)
  const pendingRequestsCount = useMemo(() =>
    dbData.requests.filter(r => r.status === 'REVIEW').length,
    [dbData.requests]);

  const activeLoansCount = useMemo(() =>
    dbData.loans.filter(l => l.status === 'ACTIVE').length,
    [dbData.loans]);

  // --- Effects ---

  // Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth & Initial Load
  useEffect(() => {
    if (token) {
      loadServerData();
    }
  }, [token]);

  // --- Handlers ---

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setDbData({ // Reset data
      clients: [], loans: [], expenses: [], receipts: [], requests: [],
      notes: [], employees: [], collectors: [], routes: [],
      goals: { monthly: 500000, daily: 15000 },
      systemSettings: { companyName: 'Presta Pro' }
    });
  };

  const showToast = (message, type = 'info') => {
    // Simple toast implementation or use a library if existed. 
    // Implementing a simple reliable one here or relying on window.alert for criticals if no toast component.
    // Ideally we push to notifications if 'error'.
    if (type === 'error') {
      addNotification(message, 'error');
    }
    // For now, console log to not break if Toast component missing.
    // If user has a Toast component, I'd use it. But I didn't see one in list_dir components.
    // Wait, PricingView used `showToast`. I should check if it was prop or global.
    // PricingView received it as prop.
    // I can implement a simple fixed toast here.
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-bold animate-fade-in ${type === 'error' ? 'bg-rose-500' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-600'
      }`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const addNotification = (text, type = 'info') => {
    setNotifications(prev => [{ id: generateId(), text, type, date: new Date().toISOString(), read: false }, ...prev]);
  };

  // --- Data Loading ---

  const loadServerData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Parallel fetch for speed - ALL services now active
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

      // Consolidated single setDbData call to avoid double render and data loss
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
  };

  // --- CRUD Wrappers (passed to views) ---

  const registerPayment = async (loanId, installmentId, options) => {
    try {
      // Get loan and client info for the receipt
      const loan = dbData.loans.find(l => l.id === loanId);
      const client = dbData.clients.find(c => c.id === loan?.clientId);
      const schedule = loan?.schedule || loan?.installments || [];

      // Get pending installments sorted by number
      const pendingInstallments = schedule
        .filter(s => s.status !== 'PAID')
        .sort((a, b) => (a.number || 0) - (b.number || 0));

      const firstInstallment = pendingInstallments.find(s => s.id === installmentId) || pendingInstallments[0];
      const paymentAmount = options?.customAmount || firstInstallment?.payment || 0;
      const penaltyAmount = options?.penaltyAmount || 0;

      // Calculate how many installments this payment covers
      const installmentPaymentAmount = firstInstallment?.payment || paymentAmount;
      const paymentBreakdown = [];
      let remainingPayment = paymentAmount;
      const paidInstallmentIds = [];
      const partialPaymentInstallments = []; // Cuotas con abono parcial

      for (const inst of pendingInstallments) {
        if (remainingPayment <= 0) break;

        const previouslyPaid = inst.paidAmount || 0; // Monto ya abonado a esta cuota
        const stillOwed = (inst.payment || installmentPaymentAmount) - previouslyPaid;
        const amountForThisInstallment = Math.min(remainingPayment, stillOwed);

        const isFullPayment = amountForThisInstallment >= stillOwed - 0.01; // Tolerancia de 1 centavo

        paymentBreakdown.push({
          number: inst.number,
          id: inst.id,
          amount: amountForThisInstallment,
          date: new Date().toISOString(),
          isPartialPayment: !isFullPayment, // Indica si es abono parcial
          previouslyPaid: previouslyPaid,
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

        // Si queda menos de 1 peso, consideramos que ya no hay más que distribuir
        if (remainingPayment < 1) break;
      }

      // Determinar si este pago es un abono parcial
      const hasPartialPayments = partialPaymentInstallments.length > 0;
      const isOnlyPartialPayment = hasPartialPayments && paidInstallmentIds.length === 0;

      // Build payment data
      const paymentData = {
        loanId,
        installmentId: firstInstallment?.id || installmentId,
        installmentNumber: firstInstallment?.number || options?.installmentNumber || 1,
        amount: paymentAmount,
        penaltyAmount: penaltyAmount,
        installmentsPaid: paymentBreakdown.length,
        isPartialPayment: isOnlyPartialPayment,
        ...options
      };

      // Call API
      const serverReceipt = await paymentService.create(paymentData);

      // Calculate remaining balance after this payment
      const totalPaidBefore = loan?.totalPaid || 0;
      const newTotalPaid = totalPaidBefore + paymentAmount + penaltyAmount;
      const remainingBalance = Math.max(0, (loan?.amount || 0) + (loan?.totalInterest || 0) - newTotalPaid);

      // Enrich receipt with client/loan data for display
      const enrichedReceipt = {
        ...serverReceipt,
        id: serverReceipt?.id || generateId(),
        clientId: loan?.clientId,
        clientName: client?.name || 'Cliente',
        clientPhone: client?.phone || '',
        loanId,
        amount: paymentAmount,
        penaltyAmount: penaltyAmount,
        installmentNumber: paymentBreakdown.length > 1
          ? `${paymentBreakdown[0].number}-${paymentBreakdown[paymentBreakdown.length - 1].number}`
          : (firstInstallment?.number || 1),
        date: serverReceipt?.date || new Date().toISOString(),
        loanAmount: loan?.amount,
        remainingBalance: remainingBalance,
        // Include full breakdown for ticket display
        paymentBreakdown: paymentBreakdown,
        installmentsPaidCount: paidInstallmentIds.length,
        // ** NUEVO: Indicadores de abono parcial **
        isPartialPayment: isOnlyPartialPayment,
        partialPaymentToInstallment: isOnlyPartialPayment ? firstInstallment?.number : null,
        concept: isOnlyPartialPayment
          ? `Abono a Cuota #${firstInstallment?.number}`
          : (paymentBreakdown.length > 1
            ? `Cuotas #${paymentBreakdown[0].number}-${paymentBreakdown[paymentBreakdown.length - 1].number}`
            : `Cuota #${firstInstallment?.number}`)
      };

      // Update local state - mark fully paid installments AND update partial payments
      setDbData(prev => ({
        ...prev,
        receipts: [...prev.receipts, enrichedReceipt],
        loans: prev.loans.map(l => l.id === loanId ? {
          ...l,
          totalPaid: newTotalPaid,
          schedule: (l.schedule || []).map(s => {
            // Marcar como PAID si está completamente pagada
            if (paidInstallmentIds.includes(s.id)) {
              return { ...s, status: 'PAID', paidDate: new Date(), paidAmount: s.payment };
            }
            // Actualizar monto abonado si es pago parcial
            const partialInfo = partialPaymentInstallments.find(p => p.id === s.id);
            if (partialInfo) {
              return {
                ...s,
                paidAmount: partialInfo.newTotalPaid,
                // Marcar como PARTIAL si no está completo
                status: 'PARTIAL'
              };
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
  };

  // --- Render ---

  // Define components for tabs to pass props
  const renderContent = () => {
    const commonProps = {
      dbData,
      setDbData,
      showToast,
      user
    };

    // Handler functions
    const addRequest = (req) => {
      const newReq = { ...req, id: generateId(), status: 'REVIEW', createdAt: new Date().toISOString() };
      setDbData(p => ({ ...p, requests: [...p.requests, newReq] }));
      // Add notification for admin
      const client = dbData.clients.find(c => c.id === req.clientId);
      addNotification(`Nueva solicitud de ${client?.name || 'cliente'} por ${formatCurrency(req.amount)}`, 'info');
    };

    const approveRequest = async (req, closingCosts = 0) => {
      try {
        // Create loan from request with calculated schedule
        const amount = parseFloat(req.amount);
        const rate = parseFloat(req.rate);
        const term = parseInt(req.term);
        const frequency = req.frequency || 'Mensual';
        const startDate = req.startDate || new Date().toISOString().split('T')[0];

        // Calculate amortization schedule (amount + closingCosts for schedule)
        const totalForSchedule = amount + closingCosts;
        const schedule = calculateSchedule(totalForSchedule, rate, term, frequency, startDate);
        const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

        // Create loan in database
        const newLoan = await loanService.create({
          clientId: req.clientId,
          amount,
          closingCosts,
          rate,
          term,
          frequency,
          startDate,
          schedule,
          totalInterest
        });

        // Update local state
        setDbData(p => ({
          ...p,
          requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r),
          loans: [...p.loans, { ...newLoan, schedule: newLoan.installments || schedule }]
        }));
        showToast('Solicitud aprobada y préstamo creado', 'success');
        addNotification('Préstamo creado desde solicitud #' + (req?.id?.slice(0, 4) || ''), 'success');
      }



      catch (error) {
        console.error('Error creating loan:', error);
        showToast('Error al crear préstamo en servidor - guardado localmente', 'error');

        // Fallback: save locally
        const amount = parseFloat(req.amount);
        const rate = parseFloat(req.rate);
        const term = parseInt(req.term);
        const frequency = req.frequency || 'Mensual';
        const startDate = req.startDate || new Date().toISOString().split('T')[0];
        const schedule = calculateSchedule(amount, rate, term, frequency, startDate);
        const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

        const newLoan = {
          id: generateId(),
          clientId: req.clientId,
          amount, rate, term, frequency, startDate,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          schedule, totalInterest, totalPaid: 0
        };

        setDbData(p => ({
          ...p,
          requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r),
          loans: [...p.loans, newLoan]
        }));
      }
    };

    const rejectRequest = (req) => {
      setDbData(p => ({
        ...p,
        requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r)
      }));
      showToast('Solicitud rechazada', 'info');
    };

    const handleAddClientDocument = async (clientId, doc) => {
      try {
        const savedDoc = await clientService.uploadDocument(clientId, doc);

        // Ajustar formato si viene envuelto
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
    };

    const addExpense = async (exp) => {
      try {
        const newExp = await expenseService.create(exp);
        setDbData(p => ({ ...p, expenses: [...p.expenses, newExp] }));
        showToast('Gasto registrado', 'success');
      } catch (e) {
        console.error('addExpense error:', e);
        // Fallback local
        const localExp = { ...exp, id: generateId(), date: new Date().toISOString() };
        setDbData(p => ({ ...p, expenses: [...p.expenses, localExp] }));
        showToast('Gasto guardado localmente', 'warning');
      }
    };

    const addCollector = async (c) => {
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
    };

    const updateCollector = async (c) => {
      try {
        await collectorService.update(c.id, c);
        setDbData(p => ({
          ...p,
          collectors: p.collectors.map(col => col.id === c.id ? { ...col, ...c } : col)
        }));
      } catch (e) {
        console.error('updateCollector error:', e);
        setDbData(p => ({
          ...p,
          collectors: p.collectors.map(col => col.id === c.id ? { ...col, ...c } : col)
        }));
      }
    };

    const removeCollector = async (id) => {
      try {
        await collectorService.delete(id);
        setDbData(p => ({ ...p, collectors: p.collectors.filter(c => c.id !== id) }));
        showToast('Cobrador eliminado', 'success');
      } catch (e) {
        console.error('removeCollector error:', e);
        setDbData(p => ({ ...p, collectors: p.collectors.filter(c => c.id !== id) }));
      }
    };

    const assignCollectorToClient = async (clientId, collectorId) => {
      try {
        await clientService.update(clientId, { collectorId });
        setDbData(p => ({
          ...p,
          clients: p.clients.map(c => c.id === clientId ? { ...c, collectorId } : c)
        }));
        showToast('Cliente asignado a ruta', 'success');
      } catch (e) {
        console.error('assignCollectorToClient error:', e);
        // Fallback local
        setDbData(p => ({
          ...p,
          clients: p.clients.map(c => c.id === clientId ? { ...c, collectorId } : c)
        }));
        showToast('Asignado localmente', 'warning');
      }
    };

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView {...commonProps}
          stats={dbData}
          loans={dbData.loans}
          clients={dbData.clients}
          receipts={dbData.receipts}
          expenses={dbData.expenses}
          user={user}
          onNavigate={(tab) => setActiveTab(tab)}
        />;
      case 'cuadre':
        return <CuadreView
          loans={dbData.loans}
          receipts={dbData.receipts}
          expenses={dbData.expenses}
          collectors={dbData.collectors}
          showToast={showToast}
        />;
      case 'clients':
        return <ClientsView
          clients={dbData.clients}
          loans={dbData.loans}
          receipts={dbData.receipts}
          collectors={dbData.collectors}
          selectedClientId={selectedClientId}
          onNewClient={() => {
            setEditingClient(null);
            setClientModalOpen(true);
          }}
          onSelectClient={(id) => {
            setSelectedClientId(id);
          }}
          onSelectLoan={(id) => {
            setActiveTab('loans');
          }}
          onEditClient={(client) => {
            setEditingClient(client);
            setClientModalOpen(true);
          }}
          onUpdateClient={async (client) => {
            if (client.collectorId !== undefined) {
              await assignCollectorToClient(client.id, client.collectorId);
            } else {
              try {
                await clientService.update(client.id, client);
                setDbData(p => ({
                  ...p,
                  clients: p.clients.map(c => c.id === client.id ? { ...c, ...client } : c)
                }));
                showToast('Cliente actualizado', 'success');
              } catch (e) {
                console.error('Update client error:', e);
                showToast('Error al actualizar cliente', 'error');
              }
            }
          }}
          onNavigateToDocuments={(clientId) => {
            setSelectedClientId(clientId);
            setActiveTab('documents');
          }}
          addClientDocument={handleAddClientDocument}
          onDeleteClient={(client) => {
            setDeleteConfirmModal({ type: 'client', item: client });
          }}
        />;
      case 'loans':
        return <LoansView
          loans={dbData.loans}
          clients={dbData.clients}
          collectors={dbData.collectors}
          registerPayment={registerPayment}
          selectedLoanId={selectedLoanId}
          onSelectLoan={(id) => setSelectedLoanId(id === selectedLoanId ? null : id)}
          onUpdateLoan={(loan) => {
            setDbData(p => ({
              ...p,
              loans: p.loans.map(l => l.id === loan.id ? loan : l)
            }));
            showToast('Préstamo actualizado', 'success');
          }}
          onCreateLoan={async (loanData) => {
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
          }}
          addClientDocument={handleAddClientDocument}
          onNavigateToDocuments={(clientId) => {
            setSelectedClientId(clientId);
            setActiveTab('documents');
          }}
          onNewClient={() => {
            setEditingClient(null);
            setClientModalOpen(true);
          }}
        />;
      case 'requests':
        return <RequestsView
          clients={dbData.clients}
          showToast={showToast}
          onNewClient={(callback) => {
            setClientCreatedCallback(() => callback);
            setEditingClient(null);
            setClientModalOpen(true);
          }}
          onCreateLoan={async (loanData) => {
            try {
              const newLoan = await loanService.create(loanData);
              setDbData(p => ({
                ...p,
                loans: [...p.loans, { ...newLoan, schedule: newLoan.installments || [] }]
              }));
              showToast('Préstamo creado desde solicitud', 'success');
            } catch (e) {
              console.error('Create loan error:', e);
              showToast(e.message || 'Error al crear préstamo', 'error');
            }
          }}
        />;
      case 'routes':
        return <RoutesView
          loans={dbData.loans}
          clients={dbData.clients}
          registerPayment={registerPayment}
          collectors={dbData.collectors}
          receipts={dbData.receipts}
          currentRouteLoanIds={dbData.routes || []}
          routeActive={dbData.routeActive || false}
          toggleLoanInRoute={(loanId, installmentId) => {
            setDbData(p => {
              const routes = p.routes || [];
              const routeKey = installmentId ? `${loanId}:${installmentId}` : loanId;
              const exists = routes.includes(routeKey);
              return { ...p, routes: exists ? routes.filter(id => id !== routeKey) : [...routes, routeKey] };
            });
          }}
          clearCurrentRoute={() => setDbData(p => ({ ...p, routes: [] }))}
          startRoute={() => setDbData(p => ({ ...p, routeActive: true }))}
          finishRoute={() => setDbData(p => ({ ...p, routeActive: false }))}
          showToast={showToast}
          addRouteClosing={(closing) => setDbData(p => ({ ...p, routeClosings: [...(p.routeClosings || []), closing] }))}
          routeClosings={dbData.routeClosings || []}
          includeFutureInstallments={dbData.systemSettings?.includeFutureInstallmentsInRoutes ?? true}
          systemSettings={dbData.systemSettings}
        />;
      case 'notes':
        return <NotesView showToast={showToast} />;
      case 'expenses':
        return <ExpensesView
          expenses={dbData.expenses}
          addExpense={addExpense}
          onDeleteExpense={async (id) => {
            try {
              await expenseService.delete(id);
              setDbData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }));
              showToast('Gasto eliminado', 'success');
            } catch (err) {
              console.error('Delete expense error:', err);
              // Fallback local
              setDbData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }));
              showToast('Gasto eliminado localmente', 'warning');
            }
          }}
        />;
      // case 'reports': removed
      case 'hr':
        return <HRView
          employees={dbData.employees}
          onNewEmployee={() => {
            setEditingEmployee(null);
            setEmployeeModalOpen(true);
          }}
          onEditEmployee={(emp) => {
            setEditingEmployee(emp);
            setEmployeeModalOpen(true);
          }}
          onDeleteEmployee={(emp) => {
            setDeleteConfirmModal({ type: 'employee', item: emp });
          }}
        />;
      case 'accounting':
        return <AccountingView
          loans={dbData.loans}
          expenses={dbData.expenses}
          receipts={dbData.receipts}
          systemSettings={dbData.systemSettings}
          routeClosings={dbData.routeClosings || []}
        />;
      case 'documents':
        return <DocumentsView
          clients={dbData.clients}
          loans={dbData.loans}
          companyName={dbData.systemSettings?.companyName}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          clientDocuments={dbData.clientDocuments || {}}
          addClientDocument={handleAddClientDocument}
        />;
      case 'calc':
        return <CalculatorView />;
      case 'ai':
        return <AIView
          chatHistory={[]}
          setChatHistory={() => { }}
          dbData={dbData}
          showToast={showToast}
          ownerName={user?.name}
          companyName={dbData.systemSettings?.companyName}
        />;
      case 'settings':
        return <SettingsView
          systemSettings={dbData.systemSettings}
          setSystemSettings={(s) => setDbData(p => ({ ...p, systemSettings: { ...p.systemSettings, ...s } }))}
          collectors={dbData.collectors}
          addCollector={addCollector}
          updateCollector={updateCollector}
          removeCollector={removeCollector}
          clients={dbData.clients}
          assignCollectorToClient={assignCollectorToClient}
          auth={{ user }}
          showToast={showToast}
          setActiveTab={setActiveTab}
        />;
      case 'pricing':
        return <SubscriptionDashboard showToast={showToast} />;
      case 'notifications':
        return <NotificationsView showToast={showToast} />;
      case 'collectors-manage':
        return <CollectorsModule showToast={showToast} clients={dbData.clients} />;
      case 'admin-panel':
        return <AdminDashboard showToast={showToast} />;
      default:
        return <DashboardView {...commonProps} />;
    }
  };


  // Check if accessing collector login route
  const isCollectorLogin = window.location.pathname.includes('collector-login');

  // Check for existing collector session
  const [collectorSession, setCollectorSession] = useState(() => {
    const token = localStorage.getItem('collectorToken');
    const data = localStorage.getItem('collectorData');
    if (token && data) {
      return { token, collector: JSON.parse(data) };
    }
    return null;
  });

  const [showChangePassword, setShowChangePassword] = useState(false);

  // If collector is logged in, show collector dashboard
  if (collectorSession) {
    const CollectorDashboard = React.lazy(() =>
      import('./modules/collectors').then(m => ({ default: m.CollectorDashboard }))
    );
    const ChangePasswordModal = React.lazy(() =>
      import('./modules/collectors').then(m => ({ default: m.ChangePasswordModal }))
    );

    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>}>
          <CollectorDashboard
            collector={collectorSession.collector}
            onLogout={() => {
              localStorage.removeItem('collectorToken');
              localStorage.removeItem('collectorData');
              localStorage.removeItem('collectorTenant');
              setCollectorSession(null);
              window.location.href = '/';
            }}
            onChangePassword={() => setShowChangePassword(true)}
            showToast={showToast}
          />
          {showChangePassword && (
            <ChangePasswordModal
              collectorId={collectorSession.collector.id}
              onClose={() => setShowChangePassword(false)}
              onSuccess={() => {
                localStorage.setItem('mustChangePassword', 'false');
              }}
              showToast={showToast}
            />
          )}
        </Suspense>
      </div>
    );
  }

  // If accessing collector login URL or not authenticated
  if (!token) {
    // Show collector login if on collector-login path
    if (isCollectorLogin) {
      const CollectorLoginView = React.lazy(() =>
        import('./modules/collectors').then(m => ({ default: m.CollectorLoginView }))
      );

      return (
        <div className={theme === 'dark' ? 'dark' : ''}>
          <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>}>
            <CollectorLoginView
              onLogin={(data) => {
                setCollectorSession({ token: data.token, collector: data.collector });
                if (data.mustChangePassword) {
                  setShowChangePassword(true);
                }
              }}
              onSwitchToUserLogin={() => window.location.href = '/'}
            />
          </Suspense>
        </div>
      );
    }

    // Show regular login
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <LoginView
          onLogin={(userData) => handleLogin(userData, userData.token)}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 transition-transform duration-300 h-full`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(t) => { setActiveTab(t); setSidebarOpen(false); }}
          pendingRequestsCount={pendingRequestsCount}
          activeLoansCount={activeLoansCount}
          theme={theme}
          toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          onLogout={handleLogout}
          companyName={dbData.systemSettings?.companyName}
        >
          <MenuSection title="Principal">
            <MenuItem id="dashboard" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="routes" label="Ruta de Cobros" icon={MapPin} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} badge={dbData.loans.length > 0 ? "Activa" : null} />
            <MenuItem id="cuadre" label="Cuadre de Caja" icon={Receipt} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
          </MenuSection>

          <MenuSection title="Operaciones">
            <MenuItem id="clients" label="Clientes" icon={Users} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="loans" label="Préstamos" icon={Receipt} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} badge={activeLoansCount || null} />
            <MenuItem id="requests" label="Solicitudes" icon={FileText} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} badge={pendingRequestsCount || null} />
            <MenuItem id="expenses" label="Gastos" icon={PieChart} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
          </MenuSection>

          <MenuSection title="Herramientas">
            <MenuItem id="documents" label="Documentos" icon={FileDigit} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="calc" label="Calculadora" icon={Calculator} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="notes" label="Notas" icon={FileText} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
          </MenuSection>

          <MenuSection title="Administración">
            {/* Reports menu item removed */}
            <MenuItem id="hr" label="RRHH" icon={UserCheck} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="accounting" label="Contabilidad" icon={Wallet} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            <MenuItem id="collectors-manage" label="Cobradores" icon={Users} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} badge="V2" />
            {user?.role === 'SUPER_ADMIN' && (
              <MenuItem id="admin-panel" label="Admin Panel" icon={Shield} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
            )}
            <MenuItem id="pricing" label="Suscripción" icon={Rocket} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} badge="Pro" />
            <MenuItem id="settings" label="Configuración" icon={Settings} activeTab={activeTab} onClick={(t) => { setActiveTab(t); setSidebarOpen(false); }} />
          </MenuSection>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTitle={{
            dashboard: 'Panel de Control',
            routes: 'Ruta de Cobros',
            cuadre: 'Cuadre de Caja',
            clients: 'Clientes',
            loans: 'Préstamos',
            expenses: 'Gastos',
            requests: 'Solicitudes',
            notes: 'Notas',
            hr: 'Recursos Humanos',
            settings: 'Ajustes',
            pricing: 'Planes',
            accounting: 'Contabilidad',
            documents: 'Documentos',
            calculator: 'Calculadora',
            ai: 'Asistente IA',
            // reports removed
          }[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          setMobileMenuOpen={setSidebarOpen}
          theme={theme}
          toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          companyName={dbData.systemSettings?.companyName}
          companyLogo={dbData.systemSettings?.companyLogo}
          userName={user?.name}
          onLogout={handleLogout}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
          onNavigate={setActiveTab}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </main>
      </div>

      {/* Client Modal */}
      <ClientModal
        open={clientModalOpen}
        onClose={() => {
          setClientModalOpen(false);
          setEditingClient(null);
          setClientCreatedCallback(null);
        }}
        onSave={async (clientData) => {
          try {
            if (editingClient) {
              // Update existing client in DB and state
              const updated = await clientService.update(editingClient.id, clientData);
              setDbData(p => ({
                ...p,
                clients: p.clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c)
              }));
              showToast('Cliente actualizado', 'success');
            } else {
              // Create new client in DB
              const newClient = await clientService.create(clientData);
              setDbData(p => ({ ...p, clients: [...p.clients, newClient] }));
              showToast('Cliente creado', 'success');

              // Call callback if exists (from RequestsView)
              if (clientCreatedCallback) {
                clientCreatedCallback(newClient.id);
                setClientCreatedCallback(null);
              }
            }
          } catch (error) {
            console.error('Error saving client:', error);
            showToast('Error al guardar cliente', 'error');
            // Fallback: still update local state
            if (!editingClient) {
              const newClientId = generateId();
              const newClient = { ...clientData, id: newClientId };
              setDbData(p => ({ ...p, clients: [...p.clients, newClient] }));
              if (clientCreatedCallback) {
                clientCreatedCallback(newClientId);
                setClientCreatedCallback(null);
              }
            }
          }
          setClientModalOpen(false);
          setEditingClient(null);
        }}
        initialClient={editingClient}
      />

      {/* Employee Modal */}
      <EmployeeModal
        open={employeeModalOpen}
        onClose={() => {
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        onSave={async (employeeData) => {
          try {
            if (editingEmployee) {
              // Update existing employee via API
              const updated = await employeeService.update(editingEmployee.id, employeeData);
              setDbData(p => {
                const updatedEmployees = p.employees.map(e => e.id === editingEmployee.id ? { ...e, ...updated } : e);
                // If role changed to/from Cobrador, sync collectors
                let updatedCollectors = [...p.collectors];
                const wasCollector = editingEmployee.role?.toLowerCase() === 'cobrador';
                const isNowCollector = employeeData.role?.toLowerCase() === 'cobrador';

                if (!wasCollector && isNowCollector) {
                  // Add to collectors via API
                  collectorService.create({ name: updated.name, phone: updated.phone || '' });
                  updatedCollectors.push({ id: updated.id, name: updated.name, phone: updated.phone || '' });
                } else if (wasCollector && !isNowCollector) {
                  // Remove from collectors
                  const collector = p.collectors.find(c => c.name === editingEmployee.name);
                  if (collector) collectorService.delete(collector.id);
                  updatedCollectors = updatedCollectors.filter(c => c.name !== editingEmployee.name);
                } else if (isNowCollector) {
                  // Update collector info
                  updatedCollectors = updatedCollectors.map(c => c.name === editingEmployee.name ? { ...c, name: updated.name, phone: updated.phone || '' } : c);
                }

                return { ...p, employees: updatedEmployees, collectors: updatedCollectors };
              });
              showToast('Empleado actualizado', 'success');
            } else {
              // Create new employee via API
              const newEmployee = await employeeService.create(employeeData);
              setDbData(p => {
                const newState = { ...p, employees: [...p.employees, newEmployee] };
                // If role is Cobrador, also add to collectors via API
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
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        initialEmployee={editingEmployee}
      />

      <FloatingAIBot
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        dbData={dbData}
        showToast={showToast}
        ownerName={dbData.systemSettings?.ownerDisplayName}
        companyName={dbData.systemSettings?.companyName}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
              Confirmar Eliminación
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              ¿Eliminar a <strong>{deleteConfirmModal.item?.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { type, item } = deleteConfirmModal;
                  try {
                    if (type === 'client') {
                      await clientService.delete(item.id);
                      setDbData(p => ({ ...p, clients: p.clients.filter(c => c.id !== item.id) }));
                      setSelectedClientId(null);
                      showToast('Cliente eliminado', 'success');
                    } else if (type === 'employee') {
                      await employeeService.delete(item.id);
                      setDbData(p => ({ ...p, employees: p.employees.filter(e => e.id !== item.id) }));
                      showToast('Empleado eliminado', 'success');
                    }
                  } catch (e) {
                    showToast(e.response?.data?.error || `Error eliminando ${type === 'client' ? 'cliente' : 'empleado'}`, 'error');
                  }
                  setDeleteConfirmModal(null);
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setMobileMenuOpen={setSidebarOpen}
        items={[
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'clients', label: 'Clientes', icon: Users },
          { id: 'routes', label: 'Cobros', icon: MapPin },
          { id: 'expenses', label: 'Gastos', icon: Wallet },
          { id: 'more', label: 'Menú', icon: Menu },
        ]}
      />

    </div>
  );
}

export default App;
