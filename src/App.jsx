import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Wallet, MapPin, Menu } from 'lucide-react';
import { applyThemeColor } from './shared/styles/tokens';

// Context & Router
import { AppDataProvider, useAppData } from './context/AppDataContext';
import AppRouter from './router/AppRouter';
import { ROUTES, SECTION_LABELS, getSidebarRoutes, getRouteTitle } from './router/routes';

// Layout
import Sidebar from './shared/components/layout/Sidebar';
import Header from './shared/components/layout/Header';
import { BottomNav } from './shared/components/layout/BottomNav';
import FloatingAIBot from './ai/FloatingAIBot';
import QuickActionsFAB from './shared/components/ui/QuickActionsFAB';
import ConnectionStatus from './shared/components/ui/ConnectionStatus';
import ModalManager from './shared/components/modals/ModalManager';
import { printReceipt } from './services/printing/PrintService';

// Auth
import { LoginView } from './modules/auth';

// --- Sidebar Menu Components ---
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

// --- Inner App (has access to context) ---
function AppShell({ onLogout }) {
  const {
    dbData, showToast, user, notifications, setNotifications,
    pendingRequestsCount, activeLoansCount,
  } = useAppData();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientCreatedCallback, setClientCreatedCallback] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply dynamic theme color
  useEffect(() => {
    applyThemeColor(dbData.systemSettings?.themeColor || 'blue');
  }, [dbData.systemSettings?.themeColor]);

  const handleTabChange = useCallback((t) => {
    setActiveTab(t);
    setSidebarOpen(false);
  }, []);

  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), []);

  // Print last receipt via AI action
  const handlePrintLastReceipt = useCallback(async () => {
    const receipts = dbData?.receipts;
    if (!Array.isArray(receipts) || receipts.length === 0) {
      showToast('No hay recibos para imprimir.', 'error');
      return;
    }
    const sorted = [...receipts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    const client = (dbData?.clients || []).find(c => c.id === last.clientId);
    const receipt = {
      ...last,
      clientName: client?.name || last.clientName || 'Cliente',
      clientCedula: client?.cedula || '',
    };
    try {
      await printReceipt(receipt, {
        companyName: dbData.systemSettings?.companyName || 'PrestApp',
        companyLogo: dbData.systemSettings?.companyLogo || '',
      });
      showToast('Recibo impreso correctamente.', 'success');
    } catch (err) {
      showToast(`Error al imprimir: ${err.message}`, 'error');
    }
  }, [dbData, showToast]);

  // Modal action helpers for AppRouter
  const modalActions = {
    openClientModal: (client = null) => { setEditingClient(client); setClientModalOpen(true); },
    openEmployeeModal: (emp = null) => { setEditingEmployee(emp); setEmployeeModalOpen(true); },
    openDeleteConfirm: (type, item) => setDeleteConfirmModal({ type, item }),
    setClientCreatedCallback,
  };

  const navParams = {
    selectedClientId, setSelectedClientId,
    selectedLoanId, setSelectedLoanId,
  };

  // Build sidebar menu from routes config
  const sidebarRoutes = getSidebarRoutes(user?.role);
  const sections = [...new Set(sidebarRoutes.map(r => r.section))];

  const getBadge = (route) => {
    if (route.badge) return route.badge;
    if (route.badgeKey === 'activeLoansCount') return activeLoansCount || null;
    if (route.badgeKey === 'pendingRequestsCount') return pendingRequestsCount || null;
    if (route.dynamicBadge === 'routeActive' && dbData.loans.length > 0) return 'Activa';
    return null;
  };

  return (
    <div className="flex min-h-screen-safe max-h-screen-safe md:h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">
      <ConnectionStatus />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm safe-area-insets"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 transition-transform duration-300 h-screen-safe md:h-full`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          pendingRequestsCount={pendingRequestsCount}
          activeLoansCount={activeLoansCount}
          theme={theme}
          toggleTheme={toggleTheme}
          companyName={dbData.systemSettings?.companyName}
        >
          {sections.map(section => (
            <MenuSection key={section} title={SECTION_LABELS[section] || section}>
              {sidebarRoutes.filter(r => r.section === section).map(route => (
                <MenuItem
                  key={route.id}
                  id={route.id}
                  label={route.label}
                  icon={route.icon}
                  activeTab={activeTab}
                  onClick={handleTabChange}
                  badge={getBadge(route)}
                />
              ))}
            </MenuSection>
          ))}
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen md:h-full overflow-hidden">
        <Header
          activeTitle={getRouteTitle(activeTab)}
          setMobileMenuOpen={setSidebarOpen}
          theme={theme}
          toggleTheme={toggleTheme}
          companyName={dbData.systemSettings?.companyName}
          companyLogo={dbData.systemSettings?.companyLogo}
          userName={user?.name}
          onLogout={onLogout}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
          onNavigate={setActiveTab}
        />

        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-24 sm:pb-20 md:pb-6 main-content-area scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          <AppRouter
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navParams={navParams}
            modalActions={modalActions}
          />
        </main>
      </div>

      {/* Modals */}
      <ModalManager
        clientModalOpen={clientModalOpen}
        setClientModalOpen={setClientModalOpen}
        editingClient={editingClient}
        setEditingClient={setEditingClient}
        clientCreatedCallback={clientCreatedCallback}
        setClientCreatedCallback={setClientCreatedCallback}
        employeeModalOpen={employeeModalOpen}
        setEmployeeModalOpen={setEmployeeModalOpen}
        editingEmployee={editingEmployee}
        setEditingEmployee={setEditingEmployee}
        deleteConfirmModal={deleteConfirmModal}
        setDeleteConfirmModal={setDeleteConfirmModal}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
      />

      {/* AI Bot */}
      <FloatingAIBot
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        dbData={dbData}
        showToast={showToast}
        ownerName={dbData.systemSettings?.ownerDisplayName}
        companyName={dbData.systemSettings?.companyName}
        onNavigate={setActiveTab}
        onOpenNewClient={() => { setEditingClient(null); setClientModalOpen(true); }}
        onOpenNewLoan={() => setActiveTab('loans')}
        onPrintReceipt={handlePrintLastReceipt}
      />

      {/* Mobile Navigation */}
      <QuickActionsFAB
        onNavigate={setActiveTab}
        onNewClient={() => { setEditingClient(null); setClientModalOpen(true); }}
      />

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

// --- Main App (Auth wrapper) ---
function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

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
  };

  if (!token) {
    return (
      <LoginView
        onLogin={(userData) => handleLogin(userData, userData.token)}
      />
    );
  }

  return (
    <AppDataProvider token={token} user={user}>
      <AppShell onLogout={handleLogout} />
    </AppDataProvider>
  );
}

export default App;
