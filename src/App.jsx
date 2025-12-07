import { useState, Suspense, lazy, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

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
  LogOut,
  Info
} from 'lucide-react';

import logoSmall from './logo.png';
import { generateSecurityToken } from './utils/ids';
import { usePrestaProState } from './state/usePrestaProState';
import PaymentTicket from './components/PaymentTicket.jsx';
import MenuSection from './components/ui/MenuSection.jsx';
import MenuItem from './components/ui/MenuItem.jsx';

import { Sidebar } from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import MobileMenu from './components/layout/MobileMenu.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import ClientModal from './components/modals/ClientModal.jsx';
import EmployeeModal from './components/modals/EmployeeModal.jsx';
import FloatingAIBot from './ai/FloatingAIBot.jsx';
import OnboardingModal from './components/modals/OnboardingModal.jsx';

// Lazy Load Views
const DashboardView = lazy(() => import('./views/DashboardView.jsx'));
const AIView = lazy(() => import('./views/AIView.jsx'));
const ClientsView = lazy(() => import('./views/ClientsView.jsx'));
const LoansView = lazy(() => import('./views/LoansView.jsx'));
const ExpensesView = lazy(() => import('./views/ExpensesView.jsx'));
const CuadreView = lazy(() => import('./views/CuadreView.jsx'));
const RequestsView = lazy(() => import('./views/RequestsView.jsx'));
const RoutesView = lazy(() => import('./views/RoutesView.jsx'));
const NotesView = lazy(() => import('./views/NotesView.jsx'));
const ReportsView = lazy(() => import('./views/ReportsView.jsx'));
const HRView = lazy(() => import('./views/HRView.jsx'));
const AccountingView = lazy(() => import('./views/AccountingView.jsx'));
const SettingsView = lazy(() => import('./views/SettingsView.jsx'));
const CalculatorView = lazy(() => import('./views/CalculatorView.jsx'));
const DocumentsView = lazy(() => import('./views/DocumentsView.jsx'));

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
    updateCollector,
    removeCollector,
    assignCollectorToClient,
    toggleLoanInRoute,
    clearCurrentRoute,
    startRoute,
    finishRoute,
    addRouteClosing,
    showToast,
    auth,
    updateLoan,
    theme,
    toggleTheme,
    clientDocuments,
    addClientDocument,
    handlePrint,
    setPrintReceipt
  } = usePrestaProState();

  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerTenantName, setRegisterTenantName] = useState('');
  const [registerTenantSlug, setRegisterTenantSlug] = useState('');
  const [registerAdminEmail, setRegisterAdminEmail] = useState('');
  const [registerAdminPassword, setRegisterAdminPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Sync Company Name from Auth
  useEffect(() => {
    if (auth.user?.tenantName && auth.user.tenantName !== systemSettings.companyName) {
      setSystemSettings(prev => ({ ...prev, companyName: auth.user.tenantName }));
    } else if (auth.user?.tenant?.name && auth.user.tenant.name !== systemSettings.companyName) {
      setSystemSettings(prev => ({ ...prev, companyName: auth.user.tenant.name }));
    }
  }, [auth.user, setSystemSettings]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPassword.trim()) {
      setLoginError('Ingresa usuario y contraseña.');
      return;
    }
    const result = await auth.login(loginUser.trim(), loginPassword.trim());
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

  const handleRegisterTenant = async (e) => {
    e.preventDefault();
    setRegisterError('');

    const tenantName = registerTenantName.trim();
    const adminEmail = registerAdminEmail.trim();
    const adminPassword = registerAdminPassword.trim();

    if (!tenantName || !adminEmail || !adminPassword) {
      setRegisterError('Completa nombre de empresa, email y contraseña.');
      return;
    }

    const slug = (registerTenantSlug || tenantName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);

    if (!slug || slug.length < 3) {
      setRegisterError('El identificador de la empresa (slug) debe tener al menos 3 caracteres.');
      return;
    }

    if (!adminEmail.includes('@')) {
      setRegisterError('Ingresa un correo válido para el administrador.');
      return;
    }

    setRegisterLoading(true);
    const result = await auth.registerTenant(tenantName, slug, adminEmail, adminPassword);
    setRegisterLoading(false);

    if (result.success) {
      // showToast('Cuenta creada. Revisa tu correo...', 'success'); // Onboarding handles this message now better
      setShowRegister(false);
      setShowOnboarding(true); // Trigger welcome flow
      setRegisterTenantName('');
      setRegisterTenantSlug('');
      setRegisterAdminEmail('');
      setRegisterAdminPassword('');
      setRegisterError('');
    } else {
      setRegisterError(result.error || 'No se pudo crear la cuenta');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4 py-10 md:py-0 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/25 rounded-full blur-[110px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/25 rounded-full blur-[110px]"></div>

        <div className="w-full max-w-md md:max-w-xl relative z-10">
          <div className="bg-gradient-to-br from-slate-900/95 via-indigo-900/90 to-sky-950/95 border border-slate-700/60 rounded-3xl px-8 pt-6 pb-10 md:px-12 md:pt-8 md:pb-12 shadow-[0_30px_80px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
            <div className="flex flex-col items-center mb-4 space-y-2">
              <div className="relative group p-4">
                <img src={logoSmall} alt="Presta Pro" className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-2xl relative z-10" />
                {/* Cinematic Shine Effect - Ultra Subtle Ghost-like */}
                <div
                  className="absolute inset-0 pointer-events-none z-20 animate-shimmer"
                  style={{
                    background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
                    maskImage: `url(${logoSmall})`,
                    WebkitMaskImage: `url(${logoSmall})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {showRegister ? 'Crear cuenta para tu financiera' : 'Acceso seguro'}
              </h2>
              <p className="text-sm text-slate-300 text-center">
                {showRegister
                  ? 'Registra tu empresa para empezar a usar Presta Pro SaaS.'
                  : 'Ingresa tus credenciales para continuar.'}
              </p>
            </div>

            {!showRegister ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario</label>
                    <input
                      type="text"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="admin@renace.tech"
                    />

                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="••••••"
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 text-center">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm py-2.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] mt-2"
                >
                  Entrar al panel
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700/50"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/90 px-2 text-slate-400">O continúa con</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      auth.loginWithGoogle(credentialResponse.credential).then((result) => {
                        if (result.success) {
                          setLoginError('');
                          showToast(`Bienvenido con Google, ${result.user?.name || 'Usuario'}`, 'success');
                          if (result.user?.role === ROLES.COLLECTOR) {
                            setActiveTab('routes');
                          } else {
                            setActiveTab('dashboard');
                          }
                        } else {
                          setLoginError(result.error || 'Error al iniciar sesión con Google');
                        }
                      });
                    }}
                    onError={() => {
                      setLoginError('Falló el inicio de sesión con Google');
                    }}
                    theme="filled_black"
                    shape="pill"
                  />
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterTenant} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la financiera / empresa</label>
                    <input
                      type="text"
                      value={registerTenantName}
                      onChange={(e) => setRegisterTenantName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="Ej: Presta Juan SRL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Identificador (slug)</label>
                    <input
                      type="text"
                      value={registerTenantSlug}
                      onChange={(e) => setRegisterTenantSlug(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="Ej: presta-juan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email administrador</label>
                    <input
                      type="email"
                      value={registerAdminEmail}
                      onChange={(e) => setRegisterAdminEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="admin@tuempresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña administrador</label>
                    <input
                      type="password"
                      value={registerAdminPassword}
                      onChange={(e) => setRegisterAdminPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="••••••"
                    />
                  </div>
                </div>

                {registerError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 text-center">
                    {registerError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-[1.02] mt-2"
                >
                  {registerLoading ? 'Creando cuenta...' : 'Crear cuenta y entrar'}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700/50"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/90 px-2 text-slate-400">O regístrate con</span>
                  </div>
                </div>


                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      auth.loginWithGoogle(credentialResponse.credential).then((result) => {
                        if (result.success) {
                          setRegisterError('');
                          showToast(`Bienvenido con Google, ${result.user?.name || 'Usuario'}`, 'success');
                          if (result.user?.role === ROLES.COLLECTOR) {
                            setActiveTab('routes');
                          } else {
                            setActiveTab('dashboard');
                          }
                        } else {
                          setRegisterError(result.error || 'Error al registrarse con Google');
                        }
                      });
                    }}
                    onError={() => {
                      setRegisterError('Error al iniciar sesión con Google');
                    }}
                    text="signup_with"
                    shape="rectangular"
                    theme="filled_black"
                    size="large"
                    width="300"
                  />
                </div>
              </form>
            )}

            <div className="mt-4 text-center text-xs text-slate-400">
              {!showRegister ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(true);
                    setRegisterError('');
                  }}
                  className="underline hover:text-slate-200"
                >
                  ¿No tienes cuenta? Crear cuenta para tu financiera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(false);
                    setLoginError('');
                  }}
                  className="underline hover:text-slate-200"
                >
                  Ya tengo cuenta, iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const role = auth.user?.role;

  const displayUserName =
    (systemSettings.ownerDisplayName && systemSettings.ownerDisplayName.trim()) ||
    auth.user?.name ||
    auth.user?.email ||
    'Admin';

  return (
    <div className="flex h-screen bg-transparent font-sans text-slate-100 print:bg-white">
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
      {showOnboarding && (
        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          userName={auth.user?.name || 'Emprendedor'}
          userEmail={auth.user?.username || auth.user?.email}
        />
      )}
      {printReceipt && <PaymentTicket receipt={printReceipt} companyName={systemSettings.companyName} companyLogo={systemSettings.companyLogo} />}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} companyName={systemSettings.companyName}>
        <MenuSection title="Tablero de Control">
          {hasPermission(role, 'dashboard') && (
            <MenuItem
              icon={LayoutDashboard}
              label="Tablero"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
          )}
          {hasPermission(role, 'accounting') && (
            <MenuItem
              icon={Banknote}
              label="Cuadre de Caja"
              active={activeTab === 'cuadre'}
              onClick={() => setActiveTab('cuadre')}
            />
          )}
        </MenuSection>

        <MenuSection title="Operaciones">
          {hasPermission(role, 'clients') && (
            <MenuItem
              icon={Users}
              label="Clientes"
              active={activeTab === 'clients'}
              onClick={() => setActiveTab('clients')}
            />
          )}
          {hasPermission(role, 'loans') && (
            <MenuItem
              icon={Wallet}
              label="Cobros"
              active={activeTab === 'loans'}
              onClick={() => setActiveTab('loans')}
            />
          )}
          {hasPermission(role, 'requests') && (
            <MenuItem
              icon={FileText}
              label="Solicitudes"
              active={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
            />
          )}
          {hasPermission(role, 'loans') && (
            <MenuItem
              icon={Briefcase}
              label="Préstamos"
              active={activeTab === 'loans'}
              onClick={() => setActiveTab('loans')}
            />
          )}
          {hasPermission(role, 'expenses') && (
            <MenuItem
              icon={TrendingUp}
              label="Gastos"
              active={activeTab === 'expenses'}
              onClick={() => setActiveTab('expenses')}
            />
          )}
        </MenuSection>

        <MenuSection title="Herramientas">
          {hasPermission(role, 'ai') && (
            <MenuItem
              icon={Zap}
              label="Asistente IA"
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
            />
          )}
          {hasPermission(role, 'routes') && (
            <MenuItem
              icon={MapPin}
              label="Rutas & GPS"
              active={activeTab === 'routes'}
              onClick={() => setActiveTab('routes')}
            />
          )}
          {hasPermission(role, 'documents') && (
            <MenuItem
              icon={FileText}
              label="Documentos"
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            />
          )}
          {hasPermission(role, 'notes') && (
            <MenuItem
              icon={ClipboardList}
              label="Notas"
              active={activeTab === 'notes'}
              onClick={() => setActiveTab('notes')}
            />
          )}
          {hasPermission(role, 'reports') && (
            <MenuItem
              icon={Printer}
              label="Reportes"
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
            />
          )}
          {hasPermission(role, 'calculator') && (
            <MenuItem
              icon={Calculator}
              label="Simulador"
              active={activeTab === 'calculator'}
              onClick={() => setActiveTab('calculator')}
            />
          )}
        </MenuSection>

        <MenuSection title="Administración">
          {hasPermission(role, 'settings') && (
            <MenuItem
              icon={Shield}
              label="Token Seguridad"
              onClick={() => {
                const token = generateSecurityToken();
                setSecurityToken(token);
                showToast('Token de seguridad actualizado: ' + token);
              }}
            />
          )}
          {hasPermission(role, 'accounting') && (
            <MenuItem
              icon={BookOpen}
              label="Contabilidad"
              active={activeTab === 'accounting'}
              onClick={() => setActiveTab('accounting')}
            />
          )}
          {hasPermission(role, 'hr') && (
            <MenuItem
              icon={UserCheck}
              label="RRHH"
              active={activeTab === 'hr'}
              onClick={() => setActiveTab('hr')}
            />
          )}
          {hasPermission(role, 'settings') && (
            <MenuItem
              icon={Settings}
              label="Ajustes"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
          )}
          <MenuItem icon={Video} label="Tutoriales" onClick={() => window.open('https://youtube.com', '_blank')} />
          <MenuItem icon={LogOut} label="Cerrar Sesión" onClick={handleLogout} />
        </MenuSection>

        <div className="mt-auto pt-6 border-t border-slate-800 text-center pb-4">
          <p className="font-bold text-slate-400 text-sm tracking-widest">RENACE.TECH</p>
        </div>
      </Sidebar>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible">
        <Header
          activeTitle={TAB_TITLES[activeTab] || 'Presta Pro'}
          setMobileMenuOpen={setMobileMenuOpen}
          theme={theme}
          toggleTheme={toggleTheme}
          companyName={systemSettings.companyName}
          userName={displayUserName}
          companyLogo={systemSettings.companyLogo}
          onLogout={handleLogout}
        />

        <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8 relative print:p-0 print:overflow-visible">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={48} />
              </div>
            }
          >
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
                addRouteClosing={addRouteClosing}
                routeClosings={routeClosings}
                receipts={receipts}
                includeFutureInstallments={systemSettings?.includeFutureInstallmentsInRoutes}
                systemSettings={systemSettings}
                handlePrint={handlePrint}
                setPrintReceipt={setPrintReceipt}
              />
            )}
            {activeTab === 'documents' && hasPermission(role, 'documents') && (
              <DocumentsView
                clients={clients}
                loans={loans}
                companyName={systemSettings.companyName}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
                clientDocuments={clientDocuments}
                addClientDocument={addClientDocument}
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
                ownerName={displayUserName}
                companyName={systemSettings.companyName}
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
                addClientDocument={addClientDocument}
              />
            )}
            {activeTab === 'calculator' && hasPermission(role, 'calculator') && <CalculatorView />}
            {activeTab === 'settings' && hasPermission(role, 'settings') && (
              <SettingsView
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                collectors={collectors}
                addCollector={addCollector}
                updateCollector={updateCollector}
                removeCollector={removeCollector}
                clients={clients}
                assignCollectorToClient={assignCollectorToClient}
                auth={auth}
              />
            )}
          </Suspense>
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setMobileMenuOpen={setMobileMenuOpen}
        items={[
          hasPermission(role, 'dashboard') && { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
          hasPermission(role, 'clients') && { id: 'clients', icon: Users, label: 'Clientes' },
          hasPermission(role, 'loans') && { id: 'loans', icon: Wallet, label: 'Cobros' },
          hasPermission(role, 'routes') && { id: 'routes', icon: MapPin, label: 'Rutas' },
          hasPermission(role, 'expenses') && { id: 'expenses', icon: TrendingUp, label: 'Gastos' },
        ].filter(Boolean)}
      />

      <MobileMenu
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setActiveTab={setActiveTab}
        items={[
          hasPermission(role, 'dashboard') && { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
          hasPermission(role, 'accounting') && { id: 'cuadre', icon: Banknote, label: 'Cuadre de Caja' },
          hasPermission(role, 'clients') && { id: 'clients', icon: Users, label: 'Clientes' },
          hasPermission(role, 'loans') && { id: 'loans', icon: Wallet, label: 'Cobros' },
          hasPermission(role, 'requests') && { id: 'requests', icon: FileText, label: 'Solicitudes' },
          hasPermission(role, 'expenses') && { id: 'expenses', icon: TrendingUp, label: 'Gastos' },
          hasPermission(role, 'routes') && { id: 'routes', icon: MapPin, label: 'Rutas & GPS' },
          hasPermission(role, 'documents') && { id: 'documents', icon: FileText, label: 'Documentos' },
          hasPermission(role, 'notes') && { id: 'notes', icon: ClipboardList, label: 'Notas' },
          hasPermission(role, 'reports') && { id: 'reports', icon: Printer, label: 'Reportes' },
          hasPermission(role, 'ai') && { id: 'ai', icon: Zap, label: 'Asistente IA' },
          hasPermission(role, 'calculator') && { id: 'calculator', icon: Calculator, label: 'Simulador' },
          hasPermission(role, 'accounting') && { id: 'accounting', icon: BookOpen, label: 'Contabilidad' },
          hasPermission(role, 'hr') && { id: 'hr', icon: UserCheck, label: 'RRHH' },
          hasPermission(role, 'settings') && { id: 'settings', icon: Settings, label: 'Ajustes' },
        ].filter(Boolean)}
      />

      {hasPermission(role, 'ai') && (
        <FloatingAIBot
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          dbData={dbData}
          showToast={showToast}
          ownerName={displayUserName}
          companyName={systemSettings.companyName}
        />
      )}

      {showNotification && (
        <div className={`fixed bottom-20 md:bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl glass flex items-center gap-3 animate-fade-in-up max-w-[90vw] md:max-w-md border-l-4 ${showNotification.type === 'error' ? 'border-l-red-500 text-red-600 dark:text-red-400' :
          showNotification.type === 'info' ? 'border-l-blue-500 text-blue-600 dark:text-blue-400' :
            'border-l-emerald-500 text-emerald-600 dark:text-emerald-400'
          }`}>
          {showNotification.type === 'error' ? <AlertCircle size={24} /> :
            showNotification.type === 'info' ? <Info size={24} /> :
              <CheckCircle size={24} />}
          <div className="flex-1">
            <p className="font-bold text-sm tracking-wide">{showNotification.type === 'error' ? 'Error' : showNotification.type === 'info' ? 'Información' : 'Éxito'}</p>
            <p className="text-sm font-medium opacity-90">{showNotification.msg}</p>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;