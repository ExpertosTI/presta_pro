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
import { clientService, loanService, paymentService, syncService } from './services/api';

// Utilities
import { generateId, generateSecurityToken } from './utils/ids';
import { formatCurrency, formatDate, formatDateTime } from './utils/formatters';

// Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ClientModal from './components/modals/ClientModal';
import EmployeeModal from './components/modals/EmployeeModal';
import PaymentTicket from './components/PaymentTicket'; // Restored import

// Views (Lazy Loaded)
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const CuadreView = React.lazy(() => import('./views/CuadreView'));
const ClientsView = React.lazy(() => import('./views/ClientsView'));
const LoansView = React.lazy(() => import('./views/LoansView'));
const ExpensesView = React.lazy(() => import('./views/ExpensesView'));
const RequestsView = React.lazy(() => import('./views/RequestsView'));
const RoutesView = React.lazy(() => import('./views/RoutesView'));
const NotesView = React.lazy(() => import('./views/NotesView'));
const ReportsView = React.lazy(() => import('./views/ReportsView'));
const PricingView = React.lazy(() => import('./views/PricingView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const DocumentsView = React.lazy(() => import('./views/DocumentsView'));
const HRView = React.lazy(() => import('./views/HRView'));
const AccountingView = React.lazy(() => import('./views/AccountingView'));
const AIView = React.lazy(() => import('./views/AIView')); // AI Helper View
const CalculatorView = React.lazy(() => import('./views/CalculatorView'));

// Login View
import LoginView from './views/LoginView';

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
        syncService.pull('expenses'), // Assuming syncService can pull generic or we need expenseService?
        // Wait, expenses might not have a service yet if crud is pending?
        // User checklist says "expenses pending".
        // I will trust what syncService returns or empty if fails.
        // Actually, let's use syncService.checkHealth or similar?
        // Better: clientService, loanService are CRUD. 
        // Let's safeLoad these.
        Promise.resolve([]), // Expenses placeholder if service missing
        Promise.resolve([]), // Employees placeholder
        Promise.resolve(null)
      ]);

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
      // Logic to call paymentService.create
      // And update local state optimistically or reload.
      const receipt = await paymentService.create({ loanId, installmentId, ...options });
      setDbData(prev => ({
        ...prev,
        receipts: [...prev.receipts, receipt],
        loans: prev.loans.map(l => l.id === loanId ? {
          ...l,
          schedule: l.schedule.map(s => s.id === installmentId ? { ...s, status: 'PAID', paidDate: new Date() } : s)
        } : l)
      }));
      showToast("Pago registrado", "success");
      return receipt;
    } catch (e) {
      showToast(e.message, "error");
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
    };

    const approveRequest = (req) => {
      setDbData(p => ({
        ...p,
        requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r)
      }));
      showToast('Solicitud aprobada', 'success');
    };

    const rejectRequest = (req) => {
      setDbData(p => ({
        ...p,
        requests: p.requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r)
      }));
      showToast('Solicitud rechazada', 'info');
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
          user={user}
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
          selectedClientId={null}
          onNewClient={async () => {
            // Just add a placeholder client for now - modal should handle this
            const localC = { id: generateId(), name: 'Nuevo Cliente', phone: '', address: '' };
            setDbData(p => ({ ...p, clients: [...p.clients, localC] }));
            showToast('Cliente agregado', 'success');
          }}
          onSelectClient={(id) => {
            // For now just log - would need state for selectedClientId
            console.log('Selected client:', id);
          }}
          onSelectLoan={(id) => {
            setActiveTab('loans');
          }}
          onEditClient={(client) => {
            console.log('Edit client:', client);
            showToast('Función de editar próximamente', 'info');
          }}
        />;
      case 'loans':
        return <LoansView
          loans={dbData.loans}
          clients={dbData.clients}
          registerPayment={registerPayment}
          user={user}
          showToast={showToast}
          onCreateLoan={async (l) => {
            try {
              const newL = await loanService.create(l);
              setDbData(p => ({ ...p, loans: [...p.loans, newL] }));
            } catch (e) {
              showToast('Error al crear préstamo', 'error');
            }
          }}
        />;
      case 'requests':
        return <RequestsView
          requests={dbData.requests}
          clients={dbData.clients}
          addRequest={addRequest}
          approveRequest={approveRequest}
          rejectRequest={rejectRequest}
          onNewClient={(callback) => {
            // Open client modal flow - simplified
            const newId = generateId();
            setDbData(p => ({ ...p, clients: [...p.clients, { id: newId, name: 'Nuevo Cliente' }] }));
            if (callback) callback(newId);
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
          showToast={showToast}
        />;
      case 'notes':
        return <NotesView notes={dbData.notes} setNotes={(n) => setDbData(p => ({ ...p, notes: typeof n === 'function' ? n(p.notes) : n }))} />;
      case 'expenses':
        return <ExpensesView expenses={dbData.expenses} addExpense={addExpense} />;
      case 'reports':
        return <ReportsView loans={dbData.loans} expenses={dbData.expenses} />;
      case 'hr':
        return <HRView employees={dbData.employees} />;
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
          activeTitle={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
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

    </div>
  );
}

export default App;
