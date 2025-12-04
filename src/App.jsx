import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calculator,
  Wallet,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Printer,
  Settings,
  Briefcase,
  MapPin,
  ClipboardList,
  Banknote,
  BookOpen,
  Shield,
  Video,
  UserCheck,
  Zap,
  List,
  Loader2,
  LogOut
} from 'lucide-react';

import logoSmall from '../logo-small.svg';
import { generateSecurityToken } from './utils/ids';
import { usePrestaProState } from './state/usePrestaProState';
import PaymentTicket from './components/PaymentTicket.jsx';
import MenuSection from './components/ui/MenuSection.jsx';
import MenuItem from './components/ui/MenuItem.jsx';

import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import MobileMenu from './components/layout/MobileMenu.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import ClientModal from './components/modals/ClientModal.jsx';
import EmployeeModal from './components/modals/EmployeeModal.jsx';

import DashboardView from './views/DashboardView.jsx';
import AIView from './views/AIView.jsx';
import ClientsView from './views/ClientsView.jsx';
import LoansView from './views/LoansView.jsx';
import ExpensesView from './views/ExpensesView.jsx';
import CuadreView from './views/CuadreView.jsx';
import RequestsView from './views/RequestsView.jsx';
import RoutesView from './views/RoutesView.jsx';
import NotesView from './views/NotesView.jsx';
import ReportsView from './views/ReportsView.jsx';
import HRView from './views/HRView.jsx';
import AccountingView from './views/AccountingView.jsx';
import SettingsView from './views/SettingsView.jsx';
import CalculatorView from './views/CalculatorView.jsx';
import DocumentsView from './views/DocumentsView.jsx';

import { hasPermission, ROLES } from './logic/authLogic';

const TAB_TITLES = {
  dashboard: 'Inicio',
  cuadre: 'Cuadre de Caja',
  clients: 'Clientes',
  loans: 'Préstamos',
  expenses: 'Gastos',
  requests: 'Solicitudes',
  routes: 'Rutas & GPS',
  documents: 'Documentos',
  notes: 'Notas',
  reports: 'Reportes',
  hr: 'Recursos Humanos',
  accounting: 'Contabilidad',
  ai: 'Asistente IA',
  calculator: 'Simulador',
  settings: 'Ajustes',
};

function App() {
  const {
    activeTab,
    mobileMenuOpen,
    showNotification,
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
    systemSettings,
    collectors,
    routeClosings,
    selectedClientId,
    selectedLoanId,
    currentRouteLoanIds,
    routeActive,
    setActiveTab,
    setMobileMenuOpen,
    setClientModalOpen,
    setEmployeeModalOpen,
    setSecurityToken,
    setChatHistory,
    setNotes,
    setSystemSettings,
    setSelectedClientId,
    setSelectedLoanId,
    dbData,
    addClient,
    updateClient,
    addEmployee,
    addExpense,
    addRequest,
    approveRequest,
    rejectRequest,
    registerPayment,
    addCollector,
    assignCollectorToClient,
    toggleLoanInRoute,
    clearCurrentRoute,
    startRoute,
    finishRoute,
    addRouteClosing,
    showToast,
    auth,
    updateLoan
  } = usePrestaProState();

  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editingClient, setEditingClient] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPassword.trim()) {
      setLoginError('Ingresa usuario y contraseña.');
      return;
    }
    const result = auth.login(loginUser.trim(), loginPassword.trim());
    if (result.success) {
      setLoginError('');
      setLoginUser('');
      setLoginPassword('');
      const loggedUser = result.user || auth.user;
      showToast(`Bienvenido, ${loggedUser?.name || 'Usuario'}`, 'success');

      if (loggedUser?.role === ROLES.COLLECTOR) {
        setActiveTab('routes');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      setLoginError(result.error || 'Error de inicio de sesión');
    }
  };

  const handleLogout = () => {
    auth.logout();
    showToast('Sesión cerrada.', 'info');
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
        <div className="w-full max-w-md md:max-w-xl">
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl px-8 py-10 md:px-12 md:py-12 shadow-[0_30px_80px_rgba(15,23,42,0.9)]">
            <div className="flex justify-center mb-8">
              <img src={logoSmall} alt="Presta Pro" className="w-56 h-56 object-contain" />
            </div>

            <h2 className="text-2xl font-bold mb-2 text-center">Acceso seguro</h2>
            <p className="text-sm text-slate-400 mb-8 text-center">
              Ingresa tus credenciales para continuar.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Usuario"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••"
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 text-center">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-lg shadow-md transition-colors mt-2"
              >
                Entrar al panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const role = auth.user?.role;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 print:bg-white">
      {clientModalOpen && (
        <ClientModal
          open={clientModalOpen}
          initialClient={editingClient}
          onClose={() => {
            setClientModalOpen(false);
            setEditingClient(null);
          }}
          onSave={(data) => {
            if (data.id) {
              updateClient(data);
            } else {
              addClient(data);
            }
            setClientModalOpen(false);
            setEditingClient(null);
          }}
        />
      )}
      {employeeModalOpen && (
        <EmployeeModal
          open={employeeModalOpen}
          onClose={() => setEmployeeModalOpen(false)}
          onSave={(data) => {
            addEmployee(data);
            setEmployeeModalOpen(false);
          }}
        />
      )}
      {printReceipt && <PaymentTicket receipt={printReceipt} />}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab}>
        <MenuSection title="Tablero de Control">
          {hasPermission(role, 'dashboard') && <MenuItem icon={LayoutDashboard} label="Tablero" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
          {hasPermission(role, 'accounting') && <MenuItem icon={Banknote} label="Cuadre de Caja" active={activeTab === 'cuadre'} onClick={() => setActiveTab('cuadre')} />}
        </MenuSection>

        <MenuSection title="Operaciones">
          {hasPermission(role, 'clients') && <MenuItem icon={Users} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />}
          {hasPermission(role, 'loans') && <MenuItem icon={Wallet} label="Cobros" active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />}
          {hasPermission(role, 'requests') && <MenuItem icon={FileText} label="Solicitudes" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />}
          {hasPermission(role, 'loans') && <MenuItem icon={Briefcase} label="Préstamos" active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />}
          {hasPermission(role, 'expenses') && <MenuItem icon={TrendingUp} label="Gastos" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />}
        </MenuSection>

        <MenuSection title="Herramientas">
          {hasPermission(role, 'ai') && <MenuItem icon={Zap} label="Asistente IA" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />}
          {hasPermission(role, 'routes') && <MenuItem icon={MapPin} label="Rutas & GPS" active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} />}
          {hasPermission(role, 'documents') && <MenuItem icon={FileText} label="Documentos" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />}
          {hasPermission(role, 'notes') && <MenuItem icon={ClipboardList} label="Notas" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />}
          {hasPermission(role, 'reports') && <MenuItem icon={Printer} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
          {hasPermission(role, 'calculator') && <MenuItem icon={Calculator} label="Simulador" active={activeTab === 'calculator'} onClick={() => setActiveTab('calculator')} />}
        </MenuSection>

        <MenuSection title="Administración">
          {hasPermission(role, 'settings') && <MenuItem icon={Shield} label="Token Seguridad" onClick={() => {
            const token = generateSecurityToken();
            setSecurityToken(token);
            showToast('Token de seguridad actualizado: ' + token);
          }} />}
          {hasPermission(role, 'accounting') && <MenuItem icon={BookOpen} label="Contabilidad" active={activeTab === 'accounting'} onClick={() => setActiveTab('accounting')} />}
          {hasPermission(role, 'hr') && <MenuItem icon={UserCheck} label="RRHH" active={activeTab === 'hr'} onClick={() => setActiveTab('hr')} />}
          {hasPermission(role, 'settings') && <MenuItem icon={Settings} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />}
          <MenuItem icon={Video} label="Tutoriales" onClick={() => window.open('https://youtube.com', '_blank')} />
          <MenuItem icon={LogOut} label="Cerrar Sesión" onClick={handleLogout} />
        </MenuSection>

        <div className="mt-auto pt-6 border-t border-slate-800 text-center pb-4">
          <p className="text-[10px] text-slate-500">Powered by</p>
          <p className="font-bold text-slate-400 text-sm tracking-widest">RENACE.TECH</p>
        </div>
      </Sidebar>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible">
        <Header activeTitle={TAB_TITLES[activeTab] || 'Presta Pro'} setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8 relative print:p-0 print:overflow-visible">
          {activeTab === 'dashboard' && hasPermission(role, 'dashboard') && (
            <DashboardView
              loans={loans}
              clients={clients}
              selectedClientId={selectedClientId}
              selectedLoanId={selectedLoanId}
              onSelectLoan={(loanId) => {
                setSelectedLoanId(loanId);
                setActiveTab('loans');
              }}
              onSelectClient={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab('clients');
              }}
            />
          )}
          {activeTab === 'cuadre' && hasPermission(role, 'accounting') && (
            <CuadreView
              receipts={receipts}
              expenses={expenses}
              clients={clients}
              collectors={collectors}
              routeClosings={routeClosings}
            />
          )}
          {activeTab === 'expenses' && hasPermission(role, 'expenses') && (
            <ExpensesView expenses={expenses} addExpense={addExpense} />
          )}
          {activeTab === 'requests' && hasPermission(role, 'requests') && (
            <RequestsView
              requests={requests}
              clients={clients}
              addRequest={addRequest}
              approveRequest={approveRequest}
              rejectRequest={rejectRequest}
              onNewClient={() => setClientModalOpen(true)}
            />
          )}
          {activeTab === 'routes' && hasPermission(role, 'routes') && (
            <RoutesView
              loans={loans}
              clients={clients}
              registerPayment={registerPayment}
              collectors={collectors}
              currentRouteLoanIds={currentRouteLoanIds}
              routeActive={routeActive}
              toggleLoanInRoute={toggleLoanInRoute}
              clearCurrentRoute={clearCurrentRoute}
              startRoute={startRoute}
              finishRoute={finishRoute}
              showToast={showToast}
              addRouteClosing={addRouteClosing}
              routeClosings={routeClosings}
              receipts={receipts}
              includeFutureInstallments={systemSettings?.includeFutureInstallmentsInRoutes}
            />
          )}
          {activeTab === 'documents' && hasPermission(role, 'documents') && (
            <DocumentsView
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
            />
          )}
          {activeTab === 'notes' && hasPermission(role, 'notes') && (
            <NotesView notes={notes} setNotes={setNotes} />
          )}
          {activeTab === 'reports' && hasPermission(role, 'reports') && (
            <ReportsView loans={loans} expenses={expenses} />
          )}
          {activeTab === 'hr' && hasPermission(role, 'hr') && (
            <HRView
              employees={dbData?.employees || []}
              onNewEmployee={() => setEmployeeModalOpen(true)}
            />
          )}
          {activeTab === 'accounting' && hasPermission(role, 'accounting') && (
            <AccountingView loans={loans} expenses={expenses} receipts={receipts} />
          )}
          {activeTab === 'ai' && hasPermission(role, 'ai') && (
            <AIView
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              dbData={dbData}
              showToast={showToast}
            />
          )}
          {activeTab === 'clients' && hasPermission(role, 'clients') && (
            <ClientsView
              clients={clients}
              loans={loans}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onSelectLoan={(loanId) => {
                setSelectedLoanId(loanId);
                setActiveTab('loans');
              }}
              onNewClient={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              onEditClient={(client) => {
                setEditingClient(client);
                setClientModalOpen(true);
              }}
            />
          )}
          {activeTab === 'loans' && hasPermission(role, 'loans') && (
            <LoansView
              loans={loans}
              clients={clients}
              registerPayment={registerPayment}
              selectedLoanId={selectedLoanId}
              onSelectLoan={setSelectedLoanId}
              onUpdateLoan={updateLoan}
            />
          )}
          {activeTab === 'calculator' && hasPermission(role, 'calculator') && <CalculatorView />}
          {activeTab === 'settings' && hasPermission(role, 'settings') && (
            <SettingsView
              systemSettings={systemSettings}
              setSystemSettings={setSystemSettings}
              collectors={collectors}
              addCollector={addCollector}
              clients={clients}
              assignCollectorToClient={assignCollectorToClient}
            />
          )}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setMobileMenuOpen={setMobileMenuOpen}
        items={[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
          { id: 'clients', icon: Users, label: 'Clientes' },
          { id: 'loans', icon: Wallet, label: 'Cobros' },
          { id: 'expenses', icon: TrendingUp, label: 'Gastos' },
          { id: 'more', icon: List, label: 'Menú' },
        ]}
      />

      <MobileMenu
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setActiveTab={setActiveTab}
        items={[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
          { id: 'clients', icon: Users, label: 'Clientes' },
          { id: 'loans', icon: Wallet, label: 'Cobros' },
          { id: 'requests', icon: FileText, label: 'Solicitudes' },
          { id: 'expenses', icon: TrendingUp, label: 'Gastos' },
          { id: 'routes', icon: MapPin, label: 'Rutas & GPS' },
          { id: 'documents', icon: FileText, label: 'Documentos' },
          { id: 'notes', icon: ClipboardList, label: 'Notas' },
          { id: 'reports', icon: Printer, label: 'Reportes' },
          { id: 'ai', icon: Zap, label: 'Asistente IA' },
          { id: 'settings', icon: Settings, label: 'Ajustes' },
        ]}
      />

      {showNotification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-up z-50 ${showNotification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {showNotification.type === 'success' ? <CheckCircle size={24} className="text-white" /> : <AlertCircle size={24} className="text-white" />}
          <p className="font-bold">{showNotification.msg}</p>
        </div>
      )}
    </div>
  );
}

export default App;