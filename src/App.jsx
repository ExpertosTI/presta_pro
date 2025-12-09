import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Calculator,
  Wallet,
  Bell,
  Search,
  Plus,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  ChevronRight,
  Menu,
  DollarSign,
  Calendar,
  Printer,
  Trash2,
  MoreVertical,
  Download,
  PieChart,
  Settings,
  HelpCircle,
  LogOut,
  Briefcase,
  MapPin,
  ClipboardList,
  Banknote,
  BookOpen,
  Shield,
  Video,
  UserCheck,
  Zap,
  Send,
  Loader2,
  List
} from 'lucide-react';
import { LineChart, Line, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import logoSmall from '../logo-small.svg';

// Components
import Card from './components/Card';
import Badge from './components/ui/Badge';
import PaymentTicket from './components/ui/PaymentTicket';
import ClientModal from './components/modals/ClientModal';
import EmployeeModal from './components/modals/EmployeeModal';
import MenuItem from './components/ui/MenuItem';
import MenuSection from './components/ui/MenuSection';

// Utils
import { generateId } from './utils/ids';
import { formatCurrency, formatDate, formatDateTime } from './utils/formatters';
import { calculateSchedule } from './utils/amortization';
import { safeLoad } from './utils/storage';

// Views
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const CuadreView = React.lazy(() => import('./views/CuadreView'));
const ClientsView = React.lazy(() => import('./views/ClientsView'));
const LoansView = React.lazy(() => import('./views/LoansView'));
const GastosView = React.lazy(() => import('./views/ExpensesView'));
const SolicitudesView = React.lazy(() => import('./views/RequestsView'));
const RutaView = React.lazy(() => import('./views/RoutesView'));
const NotasView = React.lazy(() => import('./views/NotesView'));
const ReportesView = React.lazy(() => import('./views/ReportsView'));
const RRHHView = React.lazy(() => import('./views/HRView'));
const ContabilidadView = React.lazy(() => import('./views/AccountingView'));
const AIHelper = React.lazy(() => import('./views/AIView'));
const CalculatorView = React.lazy(() => import('./views/CalculatorView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
import LoginView from './views/LoginView';



const TAB_TITLES = {
  dashboard: 'Inicio',
  cuadre: 'Cuadre de Caja',
  clients: 'Clientes',
  loans: 'Préstamos',
  expenses: 'Gastos',
  requests: 'Solicitudes',
  routes: 'Rutas & GPS',
  notes: 'Notas',
  reports: 'Reportes',
  hr: 'Recursos Humanos',
  accounting: 'Contabilidad',
  ai: 'Asistente IA',
  calculator: 'Simulador',
  settings: 'Ajustes',
};





function App() {
  // --- STATE PRINCIPAL ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [printReceipt, setPrintReceipt] = useState(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientCreationCallback, setClientCreationCallback] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [securityToken, setSecurityToken] = useState('');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!safeLoad('rt_session', null));
  const [user, setUser] = useState(() => safeLoad('rt_session', null));

  // Estado del chat AI
  const [chatHistory, setChatHistory] = useState([]);

  // Datos persistentes
  const [clients, setClients] = useState(() => safeLoad('rt_clients', []));
  const [loans, setLoans] = useState(() => safeLoad('rt_loans', []));
  const [expenses, setExpenses] = useState(() => safeLoad('rt_expenses', []));
  const [requests, setRequests] = useState(() => safeLoad('rt_requests', []));
  const [notes, setNotes] = useState(() => safeLoad('rt_notes', []));
  const [employees, setEmployees] = useState(() => safeLoad('rt_employees', []));
  const [receipts, setReceipts] = useState(() => safeLoad('rt_receipts', []));
  const [routeClosings, setRouteClosings] = useState(() => safeLoad('rt_closings', []));

  // Estado de Navegación y Selección
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  // Estado para Rutas y Cobradores
  const [collectors, setCollectors] = useState([
    { id: '1', name: 'Cobrador Principal', active: true },
    { id: '2', name: 'Cobrador Auxiliar', active: true }
  ]);
  const [currentRouteLoanIds, setCurrentRouteLoanIds] = useState([]);
  const [routeActive, setRouteActive] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    companyName: 'Presta Pro',
    companyLogo: logoSmall
  });

  // Bundle para el asistente AI
  const dbData = { clients, loans, expenses, requests, notes, receipts };

  // --- EFECTOS DE PERSISTENCIA ---
  useEffect(() => localStorage.setItem('rt_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('rt_loans', JSON.stringify(loans)), [loans]);
  useEffect(() => localStorage.setItem('rt_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('rt_requests', JSON.stringify(requests)), [requests]);
  useEffect(() => localStorage.setItem('rt_notes', JSON.stringify(notes)), [notes]);

  useEffect(() => localStorage.setItem('rt_receipts', JSON.stringify(receipts)), [receipts]);
  useEffect(() => localStorage.setItem('rt_closings', JSON.stringify(routeClosings)), [routeClosings]);
  useEffect(() => localStorage.setItem('rt_employees', JSON.stringify(employees)), [employees]);

  // --- ACCIONES GLOBALES ---
  const showToast = (msg, type = 'success') => {
    setShowNotification({ msg, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handlePrint = () => {
    window.print();
    setTimeout(() => setPrintReceipt(null), 1000);
  };

  const addClient = (data) => {
    const newClient = { ...data, id: generateId(), score: 70 };
    setClients([...clients, newClient]);
    showToast('Cliente registrado correctamente');
    // Don't force tab change - let the caller decide
    return newClient;
  };

  const addExpense = (data) => {
    setExpenses([...expenses, { ...data, id: generateId(), date: new Date().toISOString() }]);
    showToast('Gasto registrado');
  };

  const addEmployee = (data) => {
    const newEmployee = { ...data, id: generateId() };
    setEmployees([...employees, newEmployee]);
    showToast('Empleado agregado correctamente');
    return newEmployee;
  };

  const addRequest = (data) => {
    setRequests([...requests, { ...data, id: generateId(), status: 'REVIEW', date: new Date().toISOString() }]);
    showToast('Solicitud enviada a revisión');
  };

  const approveRequest = (req) => {
    createLoan(req);
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
  };

  const rejectRequest = (req) => {
    setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    showToast('Solicitud rechazada', 'success');
  };

  const createLoan = (loanData) => {
    const schedule = calculateSchedule(
      loanData.amount, loanData.rate, loanData.term, loanData.frequency, loanData.startDate
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

  const registerPayment = (loanId, installmentId) => {
    const loan = loans.find(l => l.id === loanId);
    const installment = loan?.schedule.find(i => i.id === installmentId);
    const client = clients.find(c => c.id === loan?.clientId);
    if (!loan || !installment || !client) return;

    const newReceipt = {
      id: generateId(),
      date: new Date().toISOString(),
      loanId: loan.id,
      clientId: client.id,
      clientName: client.name,
      amount: installment.payment,
      installmentNumber: installment.number,
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

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('rt_session', JSON.stringify(userData));
    showToast(`Bienvenido, ${userData.name}`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('rt_session');
    // window.location.reload(); // No need to reload, React state handles it
  };

  // --- HANDLERS ADICIONALES ---
  const onSelectClient = (id) => {
    setSelectedClientId(id);
    setActiveTab('clients');
  };

  const onSelectLoan = (id) => {
    setSelectedLoanId(id);
    setActiveTab('loans');
  };

  const onUpdateLoan = (updatedLoan) => {
    setLoans(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    showToast('Préstamo actualizado');
  };

  // Rutas
  const toggleLoanInRoute = (loanId, installmentId) => {
    const key = `${loanId}:${installmentId}`;
    if (currentRouteLoanIds.includes(key)) {
      setCurrentRouteLoanIds(currentRouteLoanIds.filter(id => id !== key));
    } else {
      setCurrentRouteLoanIds([...currentRouteLoanIds, key]);
    }
  };

  const clearCurrentRoute = () => {
    setCurrentRouteLoanIds([]);
    setRouteActive(false);
  };

  const startRoute = () => setRouteActive(true);
  const finishRoute = () => {
    setRouteActive(false);
    setCurrentRouteLoanIds([]);
  };

  const addRouteClosing = (closingData) => {
    setRouteClosings([...routeClosings, { ...closingData, id: generateId() }]);
  };

  // --- HANDLERS para SETTINGS (Cobradores y Asignaciones) ---
  const addCollector = (collectorData) => {
    setCollectors([...collectors, { ...collectorData, id: generateId(), active: true }]);
    showToast('Cobrador agregado');
  };

  const updateCollector = (updatedCollector) => {
    setCollectors(collectors.map(c => c.id === updatedCollector.id ? { ...c, ...updatedCollector } : c));
    showToast('Cobrador actualizado');
  };

  const removeCollector = (id) => {
    setCollectors(collectors.filter(c => c.id !== id));
    showToast('Cobrador eliminado');
  };

  const assignCollectorToClient = (clientId, collectorId) => {
    setClients(clients.map(c => c.id === clientId ? { ...c, collectorId } : c));
    showToast('Cliente asignado a cobrador');
  };



  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 print:bg-white">
      {/* CLIENT MODAL */}
      {clientModalOpen && (
        <ClientModal
          open={clientModalOpen}
          onClose={() => { setClientModalOpen(false); setClientCreationCallback(null); }}
          onSave={(data) => {
            const newClient = addClient(data);
            setClientModalOpen(false);
            // If there's a callback (from RequestsView), call it with the new client ID
            if (clientCreationCallback) {
              clientCreationCallback(newClient.id);
              setClientCreationCallback(null);
            }
          }}
        />
      )}
      {/* EMPLOYEE MODAL */}
      {employeeModalOpen && (
        <EmployeeModal
          open={employeeModalOpen}
          onSave={(data) => { addEmployee(data); setEmployeeModalOpen(false); }}
          onClose={() => setEmployeeModalOpen(false)}
        />
      )}
      {/* TICKET PRINTER OVERLAY */}
      {printReceipt && <PaymentTicket receipt={printReceipt} />}
      {/* TICKET PRINTER OVERLAY */}
      {printReceipt && <PaymentTicket receipt={printReceipt} />}

      {/* Sidebar - HIDDEN ON PRINT */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-2xl z-20 print:hidden">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
            <img src={logoSmall} alt="Presta Pro" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight block leading-none">Presta Pro</span>
            <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Gestión de Préstamos</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <MenuSection title="Tablero de Control">
            <MenuItem icon={LayoutDashboard} label="Tablero" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <MenuItem icon={Banknote} label="Cuadre de Caja" active={activeTab === 'cuadre'} onClick={() => setActiveTab('cuadre')} />
          </MenuSection>

          <MenuSection title="Operaciones">
            <MenuItem icon={Users} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
            <MenuItem icon={Wallet} label="Cobros" active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
            <MenuItem icon={FileText} label="Solicitudes" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
            <MenuItem icon={Briefcase} label="Préstamos" active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
            <MenuItem icon={TrendingUp} label="Gastos" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
          </MenuSection>

          <MenuSection title="Herramientas">
            <MenuItem icon={Zap} label="Asistente IA" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
            <MenuItem icon={MapPin} label="Rutas & GPS" active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} />
            <MenuItem icon={ClipboardList} label="Notas" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
            <MenuItem icon={Printer} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <MenuItem icon={Calculator} label="Simulador" active={activeTab === 'calculator'} onClick={() => setActiveTab('calculator')} />
          </MenuSection>

          <MenuSection title="Administración">
            <MenuItem icon={Shield} label="Token Seguridad" onClick={() => {
              const token = generateSecurityToken();
              setSecurityToken(token);
              showToast('Token de seguridad actualizado: ' + token);
            }} />
            <MenuItem icon={BookOpen} label="Contabilidad" active={activeTab === 'accounting'} onClick={() => setActiveTab('accounting')} />
            <MenuItem icon={UserCheck} label="RRHH" active={activeTab === 'hr'} onClick={() => setActiveTab('hr')} />
            <MenuItem icon={Settings} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />

            <MenuItem icon={Video} label="Tutoriales" onClick={() => window.open('https://youtube.com', '_blank')} />
            <MenuItem icon={LogOut} label="Cerrar Sesión" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-900/20" />
          </MenuSection>

          <div className="mt-auto pt-6 border-t border-slate-800 text-center pb-4">
            <p className="text-[10px] text-slate-500">Powered by</p>
            <p className="font-bold text-slate-400 text-sm tracking-widest">RENACE.TECH</p>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative print:h-auto print:overflow-visible">
        {/* Header - HIDDEN ON PRINT */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 print:hidden">
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)}><Menu /></button>
            <img src={logoSmall} alt="Presta Pro" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-bold text-slate-800">Presta Pro</span>
          </div>
          <h1 className="hidden md:block text-xl font-bold text-slate-800">{TAB_TITLES[activeTab] || 'Presta Pro'}</h1>
          <div className="flex items-center gap-4">
            <button className="bg-slate-100 p-2 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
              <span className="text-sm font-bold hidden md:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8 relative print:p-0 print:overflow-visible">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}>
            {activeTab === 'dashboard' && <DashboardView loans={loans} clients={clients} activeTab={activeTab} />}
            {activeTab === 'cuadre' && <CuadreView />}
            {activeTab === 'expenses' && <GastosView expenses={expenses} addExpense={addExpense} />}
            {activeTab === 'requests' && <SolicitudesView requests={requests} clients={clients} addRequest={addRequest} approveRequest={approveRequest} rejectRequest={rejectRequest} onNewClient={(callback) => { setClientCreationCallback(() => callback); setClientModalOpen(true); }} />}
            {activeTab === 'routes' && (
              <RutaView
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
                showToast={showToast}
                handlePrint={handlePrint}
                setPrintReceipt={setPrintReceipt}
                systemSettings={systemSettings}
              />
            )}
            {activeTab === 'notes' && <NotasView notes={notes} setNotes={setNotes} />}
            {activeTab === 'reports' && <ReportesView loans={loans} expenses={expenses} />}
            {activeTab === 'hr' && <RRHHView employees={employees} onNewEmployee={() => setEmployeeModalOpen(true)} />}
            {activeTab === 'accounting' && <ContabilidadView />}
            {activeTab === 'ai' && (
              <AIHelper chatHistory={chatHistory} setChatHistory={setChatHistory} dbData={dbData} showToast={showToast} />
            )}

            {activeTab === 'clients' && (
              <ClientsView
                clients={clients}
                loans={loans}
                onNewClient={() => setClientModalOpen(true)}
                selectedClientId={selectedClientId}
                onSelectClient={onSelectClient}
                onSelectLoan={onSelectLoan}
              />
            )}
            {activeTab === 'loans' && (
              <LoansView
                loans={loans}
                clients={clients}
                registerPayment={registerPayment}
                selectedLoanId={selectedLoanId}
                onSelectLoan={onSelectLoan}
                onUpdateLoan={onUpdateLoan}
              />
            )}
            {activeTab === 'calculator' && <CalculatorView />}
            {activeTab === 'settings' && (
              <SettingsView
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                collectors={collectors}
                addCollector={addCollector}
                updateCollector={updateCollector}
                removeCollector={removeCollector}
                clients={clients}
                assignCollectorToClient={assignCollectorToClient}
                auth={{ user: user || { name: 'Admin', role: 'admin' } }}
              />
            )}
          </React.Suspense>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col p-6 text-white md:hidden animate-fade-in backdrop-blur-sm overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl font-bold">Menú</span>
            <button onClick={() => setMobileMenuOpen(false)}><X /></button>
          </div>
          {/* Replicate Sidebar Menu Items Here for Mobile */}
          <div className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className="w-full py-3 border-b border-slate-700 text-left flex items-center gap-3"><LayoutDashboard size={18} /> Dashboard</button>
            <button onClick={() => { setActiveTab('cuadre'); setMobileMenuOpen(false); }} className="w-full py-3 border-b border-slate-700 text-left flex items-center gap-3"><Banknote size={18} /> Cuadre de Caja</button>

            <div className="pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Operaciones</div>
            <button onClick={() => { setActiveTab('clients'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Users size={18} /> Clientes</button>
            <button onClick={() => { setActiveTab('loans'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Wallet size={18} /> Préstamos y Cobros</button>
            <button onClick={() => { setActiveTab('requests'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><FileText size={18} /> Solicitudes</button>
            <button onClick={() => { setActiveTab('expenses'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><TrendingUp size={18} /> Gastos</button>

            <div className="pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Herramientas</div>
            <button onClick={() => { setActiveTab('ai'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Zap size={18} /> Asistente AI</button>
            <button onClick={() => { setActiveTab('routes'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><MapPin size={18} /> Rutas</button>
            <button onClick={() => { setActiveTab('notes'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><ClipboardList size={18} /> Notas</button>
            <button onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Printer size={18} /> Reportes</button>
            <button onClick={() => { setActiveTab('calculator'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Calculator size={18} /> Simulador</button>

            <div className="pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Admin</div>
            <button onClick={() => { setActiveTab('accounting'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><BookOpen size={18} /> Contabilidad</button>
            <button onClick={() => { setActiveTab('hr'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><UserCheck size={18} /> RRHH</button>
            <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Settings size={18} /> Ajustes</button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 bg-white border-t border-slate-200 flex justify-around py-2 px-1 md:hidden print:hidden z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
          { id: 'clients', icon: Users, label: 'Clientes' },
          { id: 'loans', icon: Wallet, label: 'Cobros' },
          { id: 'expenses', icon: TrendingUp, label: 'Gastos' },
          { id: 'more', icon: List, label: 'Menú' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = item.id !== 'more' && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setMobileMenuOpen(true);
                } else {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }
              }}
              className={`flex flex-col items-center text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 ${isActive ? 'bg-blue-50' : 'bg-slate-100'
                  }`}
              >
                <Icon size={18} />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast */}
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