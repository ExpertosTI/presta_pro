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
  CreditCard
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
import { clientService, loanService, paymentService, syncService, settingsService } from './services/api';

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

// Views (Lazy Loaded)
const DashboardView = React.lazy(() => import('./modules/dashboard').then(module => ({ default: module.DashboardView })));
const CuadreView = React.lazy(() => import('./modules/accounting').then(module => ({ default: module.CuadreView })));
const ClientsView = React.lazy(() => import('./modules/clients').then(module => ({ default: module.ClientsView })));
const LoansView = React.lazy(() => import('./modules/loans').then(module => ({ default: module.LoansView })));
const ExpensesView = React.lazy(() => import('./modules/expenses').then(module => ({ default: module.ExpensesView })));
const RequestsView = React.lazy(() => import('./modules/requests').then(module => ({ default: module.RequestsView })));
const RoutesView = React.lazy(() => import('./modules/routes').then(module => ({ default: module.RoutesView })));
const NotesView = React.lazy(() => import('./modules/notes').then(module => ({ default: module.NotesView })));
const ReportsView = React.lazy(() => import('./modules/reports').then(module => ({ default: module.ReportsView })));
const PricingView = React.lazy(() => import('./modules/settings').then(module => ({ default: module.PricingView })));
const SettingsView = React.lazy(() => import('./modules/settings').then(module => ({ default: module.SettingsView })));
const DocumentsView = React.lazy(() => import('./modules/documents').then(module => ({ default: module.DocumentsView })));
const HRView = React.lazy(() => import('./modules/employees').then(module => ({ default: module.HRView })));
const AccountingView = React.lazy(() => import('./modules/accounting').then(module => ({ default: module.AccountingView })));
const AIView = React.lazy(() => import('./modules/ai').then(module => ({ default: module.AIView })));
const CalculatorView = React.lazy(() => import('./modules/tools').then(module => ({ default: module.CalculatorView })));

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

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [clientCreatedCallback, setClientCreatedCallback] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

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
      // Parallel fetch for speed
      const [clients, loans, payments, expensesRes, employeesRes, settingsRes] = await Promise.all([
        clientService.getAll(),
        loanService.getAll(),
        paymentService.getAll(),
        Promise.resolve([]), // Expenses placeholder
        Promise.resolve([]), // Employees placeholder
        settingsService.get(),
      ]);

      const settings = settingsRes || { companyName: 'Presta Pro' };

      setDbData(prev => ({
        ...prev,
        clients: clients || [],
        loans: loans || [],
        receipts: payments || [],
        expenses: expensesRes || [],
        employees: employeesRes || [],
        systemSettings: {
          ...prev.systemSettings,
          ...settings
        }
      }));

      // For now, let's try to load what we can.
      // If paymentService.getAll returns receipts, good.

      // We might need to fetch 'everything' via a sync endpoint if implemented.
      // But standard CRUD is safer for now.

      setDbData(prev => ({
        ...prev,
        clients: Array.isArray(clients) ? clients : [],
        loans: Array.isArray(loans) ? loans : [],
        receipts: Array.isArray(payments) ? payments : [],
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
      const installment = loan?.schedule?.find(s => s.id === installmentId) ||
        loan?.installments?.find(s => s.id === installmentId);

      // Build payment data
      const paymentData = {
        loanId,
        installmentId,
        installmentNumber: installment?.number || options?.installmentNumber || 0,
        amount: options?.customAmount || installment?.payment || 0,
        penaltyAmount: options?.penaltyAmount || 0,
        ...options
      };

      // Call API
      const serverReceipt = await paymentService.create(paymentData);

      // Enrich receipt with client/loan data for display
      const enrichedReceipt = {
        ...serverReceipt,
        id: serverReceipt?.id || generateId(),
        clientId: loan?.clientId,
        clientName: client?.name || 'Cliente',
        clientPhone: client?.phone || '',
        loanId,
        amount: paymentData.amount,
        penaltyAmount: paymentData.penaltyAmount,
        installmentNumber: paymentData.installmentNumber,
        date: serverReceipt?.date || new Date().toISOString(),
        loanAmount: loan?.amount,
        remainingBalance: (loan?.amount || 0) - ((loan?.totalPaid || 0) + paymentData.amount + paymentData.penaltyAmount),
      };

      setDbData(prev => ({
        ...prev,
        receipts: [...prev.receipts, enrichedReceipt],
        loans: prev.loans.map(l => l.id === loanId ? {
          ...l,
          totalPaid: (l.totalPaid || 0) + paymentData.amount + paymentData.penaltyAmount,
          schedule: (l.schedule || []).map(s => s.id === installmentId ? { ...s, status: 'PAID', paidDate: new Date() } : s)
        } : l)
      }));
      showToast("Pago registrado", "success");
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

    const approveRequest = async (req) => {
      try {
        // Create loan from request with calculated schedule
        const amount = parseFloat(req.amount);
        const rate = parseFloat(req.rate);
        const term = parseInt(req.term);
        const frequency = req.frequency || 'Mensual';
        const startDate = req.startDate || new Date().toISOString().split('T')[0];

        // Calculate amortization schedule
        const schedule = calculateSchedule(amount, rate, term, frequency, startDate);
        const totalInterest = schedule.reduce((acc, item) => acc + item.interest, 0);

        // Create loan in database
        const newLoan = await loanService.create({
          clientId: req.clientId,
          amount,
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

    const addExpense = (exp) => {
      const newExp = { ...exp, id: generateId(), date: new Date().toISOString() };
      setDbData(p => ({ ...p, expenses: [...p.expenses, newExp] }));
      showToast('Gasto registrado', 'success');
    };

    const addCollector = (c) => {
      const newC = { ...c, id: generateId() };
      setDbData(p => ({ ...p, collectors: [...p.collectors, newC] }));
    };

    const updateCollector = (c) => {
      setDbData(p => ({
        ...p,
        collectors: p.collectors.map(col => col.id === c.id ? { ...col, ...c } : col)
      }));
    };

    const removeCollector = (id) => {
      setDbData(p => ({ ...p, collectors: p.collectors.filter(c => c.id !== id) }));
    };

    const assignCollectorToClient = (clientId, collectorId) => {
      setDbData(p => ({
        ...p,
        clients: p.clients.map(c => c.id === clientId ? { ...c, collectorId } : c)
      }));
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
          addClientDocument={handleAddClientDocument}
        />;
      case 'loans':
        return <LoansView
          loans={dbData.loans}
          clients={dbData.clients}
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
          addClientDocument={handleAddClientDocument}
        />;
      case 'requests':
        return <RequestsView
          requests={dbData.requests}
          clients={dbData.clients}
          addRequest={addRequest}
          approveRequest={approveRequest}
          rejectRequest={rejectRequest}
          onNewClient={(callback) => {
            setClientCreatedCallback(() => callback);
            setEditingClient(null);
            setClientModalOpen(true);
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
          toggleLoanInRoute={(loanId) => {
            setDbData(p => {
              const routes = p.routes || [];
              const exists = routes.includes(loanId);
              return { ...p, routes: exists ? routes.filter(id => id !== loanId) : [...routes, loanId] };
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
        return <NotesView notes={dbData.notes} setNotes={(n) => setDbData(p => ({ ...p, notes: typeof n === 'function' ? n(p.notes) : n }))} />;
      case 'expenses':
        return <ExpensesView expenses={dbData.expenses} addExpense={addExpense} />;
      case 'reports':
        return <ReportsView loans={dbData.loans} expenses={dbData.expenses} />;
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
        />;
      case 'accounting':
        return <AccountingView dbData={dbData} />;
      case 'documents':
        return <DocumentsView clients={dbData.clients} loans={dbData.loans} />;
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
        />;
      case 'pricing':
        return <PricingView showToast={showToast} />;
      default:
        return <DashboardView {...commonProps} />;
    }
  };


  // If not authenticated, show login
  if (!token) {
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
            <MenuItem id="dashboard" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="routes" label="Ruta de Cobros" icon={MapPin} activeTab={activeTab} onClick={setActiveTab} badge={dbData.loans.length > 0 ? "Activa" : null} />
            <MenuItem id="cuadre" label="Cuadre de Caja" icon={Receipt} activeTab={activeTab} onClick={setActiveTab} />
          </MenuSection>

          <MenuSection title="Operaciones">
            <MenuItem id="clients" label="Clientes" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="loans" label="Préstamos" icon={Receipt} activeTab={activeTab} onClick={setActiveTab} badge={activeLoansCount || null} />
            <MenuItem id="requests" label="Solicitudes" icon={FileText} activeTab={activeTab} onClick={setActiveTab} badge={pendingRequestsCount || null} />
            <MenuItem id="expenses" label="Gastos" icon={PieChart} activeTab={activeTab} onClick={setActiveTab} />
          </MenuSection>

          <MenuSection title="Herramientas">
            <MenuItem id="documents" label="Documentos" icon={FileDigit} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="calc" label="Calculadora" icon={Calculator} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="notes" label="Notas" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="ai" label="Asistente IA" icon={BrainCircuit} activeTab={activeTab} onClick={setActiveTab} badge="New" />
          </MenuSection>

          <MenuSection title="Administración">
            <MenuItem id="reports" label="Reportes" icon={PieChart} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="hr" label="RRHH" icon={UserCheck} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="accounting" label="Contabilidad" icon={Wallet} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="pricing" label="Planes y Precios" icon={CreditCard} activeTab={activeTab} onClick={setActiveTab} />
            <MenuItem id="settings" label="Configuración" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
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
            reports: 'Reportes'
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
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
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
        onSave={(employeeData) => {
          if (editingEmployee) {
            // Update existing employee
            setDbData(p => {
              const updatedEmployees = p.employees.map(e => e.id === editingEmployee.id ? { ...e, ...employeeData } : e);
              // If role changed to/from Cobrador, update collectors
              let updatedCollectors = [...p.collectors];
              const wasCollector = editingEmployee.role?.toLowerCase() === 'cobrador';
              const isNowCollector = employeeData.role?.toLowerCase() === 'cobrador';

              if (!wasCollector && isNowCollector) {
                // Add to collectors
                updatedCollectors.push({ id: editingEmployee.id, name: employeeData.name, phone: employeeData.phone || '' });
              } else if (wasCollector && !isNowCollector) {
                // Remove from collectors
                updatedCollectors = updatedCollectors.filter(c => c.id !== editingEmployee.id);
              } else if (isNowCollector) {
                // Update collector info
                updatedCollectors = updatedCollectors.map(c => c.id === editingEmployee.id ? { ...c, name: employeeData.name, phone: employeeData.phone || '' } : c);
              }

              return { ...p, employees: updatedEmployees, collectors: updatedCollectors };
            });
            showToast('Empleado actualizado', 'success');
          } else {
            // Add new employee
            const newEmployee = { ...employeeData, id: generateId() };
            setDbData(p => {
              const newState = { ...p, employees: [...p.employees, newEmployee] };
              // If role is Cobrador, also add to collectors
              if (employeeData.role?.toLowerCase() === 'cobrador') {
                newState.collectors = [...p.collectors, { id: newEmployee.id, name: newEmployee.name, phone: newEmployee.phone || '' }];
              }
              return newState;
            });
            showToast('Empleado creado', 'success');
            if (employeeData.role?.toLowerCase() === 'cobrador') {
              showToast('Agregado a cobradores automáticamente', 'info');
            }
          }
          setEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        initialEmployee={editingEmployee}
      />

    </div>
  );
}

export default App;
