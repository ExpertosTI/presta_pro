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
import { formatCurrency, formatDate, formatDateTime } from './utils/formatters';
import { generateId, generateSecurityToken } from './utils/ids';
import { safeLoad } from './utils/storage';
import { calculateSchedule } from './utils/amortization';
import { usePrestaProState } from './state/usePrestaProState';

// Nuevos componentes modularizados
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

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className} print:border-none print:shadow-none`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    ACTIVE: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    LATE: 'bg-red-100 text-red-800',
    PENDING: 'bg-slate-100 text-slate-800',
    APPROVED: 'bg-teal-100 text-teal-800',
    REJECTED: 'bg-red-50 text-red-600',
    REVIEW: 'bg-yellow-100 text-yellow-800'
  };

  const labels = {
    ACTIVE: 'Activo',
    PAID: 'Pagado',
    LATE: 'Atrasado',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    REVIEW: 'En revisión',
  };

  const label = labels[status] || status;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}>
      {label}
    </span>
  );
};

// --- TICKET DE PAGO (ESTILO MODERNO / IMPRESIÓN TÉRMICA) ---
const PaymentTicket = ({ receipt, companyName = "Presta Pro" }) => {
  if (!receipt) return null;
  return (
    <div className="hidden print:block fixed inset-0 bg-slate-100 z-[100] p-3 font-sans text-slate-900 text-[12px] leading-tight">
      <div className="max-w-[80mm] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Encabezado */}
        <div className="px-3 pt-3 pb-1.5 text-center border-b border-slate-200 bg-slate-50">
          <h1 className="text-lg font-extrabold tracking-tight mb-0.5">{companyName}</h1>
          <p className="text-[10px] text-slate-600 font-semibold">RNC: 101-00000-1</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-emerald-600 font-bold text-[12px]">
            <CheckCircle size={13} className="inline-block" />
            <span>Pago registrado</span>
          </div>
        </div>

        {/* Monto principal */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] text-slate-600 font-semibold mb-0.5 uppercase">Monto pagado</p>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(receipt.amount)}</p>
        </div>

        {/* Detalles principales */}
        <div className="px-3 py-2 space-y-0.5">
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Recibo</span>
            <span className="font-mono font-bold text-slate-900">{receipt.id.substr(0,8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-[11px] items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar size={11} /> Fecha pago
            </span>
            <span className="font-bold text-slate-900">{formatDateTime(receipt.date)}</span>
          </div>
        </div>

        {/* Cliente y préstamo */}
        <div className="px-3 py-1.5 border-t border-slate-100 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 uppercase">Cliente</p>
          <p className="text-[12px] font-bold text-slate-900">{receipt.clientName}</p>
          {receipt.clientPhone && (
            <p className="text-[11px] text-slate-700 font-semibold">Tel: {receipt.clientPhone}</p>
          )}
          {receipt.clientAddress && (
            <p className="text-[11px] text-slate-700 flex items-center gap-1 font-semibold">
              <MapPin size={10} /> {receipt.clientAddress}
            </p>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-slate-100 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 uppercase">Préstamo</p>
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-slate-700">ID</span>
            <span className="font-mono font-bold text-slate-900">{receipt.loanId.substr(0,6).toUpperCase()}</span>
          </div>
          {typeof receipt.loanAmount === 'number' && (
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Monto del préstamo</span>
              <span className="font-bold text-slate-900">{formatCurrency(receipt.loanAmount)}</span>
            </div>
          )}
          {typeof receipt.totalPaidAfter === 'number' && (
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Total pagado</span>
              <span className="font-bold text-slate-900">{formatCurrency(receipt.totalPaidAfter)}</span>
            </div>
          )}
          {typeof receipt.remainingBalance === 'number' && (
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Balance pendiente</span>
              <span className="font-bold text-slate-900">{formatCurrency(receipt.remainingBalance)}</span>
            </div>
          )}
        </div>

        {/* Info de cuota */}
        <div className="px-3 py-1.5 border-t border-slate-100 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 uppercase">Detalle de la cuota</p>
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Cuota #</span>
            <span className="font-bold text-slate-900">{receipt.installmentNumber}</span>
          </div>
          {receipt.installmentDate && (
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Fecha programada</span>
              <span className="font-bold text-slate-900">{formatDate(receipt.installmentDate)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Concepto</span>
            <span className="font-bold text-slate-900">Pago de cuota</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Cobrador</span>
            <span className="font-bold text-slate-900">Admin</span>
          </div>
        </div>

        {/* Pie */}
        <div className="px-3 py-2 text-center border-t border-slate-200 bg-slate-50 mt-0.5">
          <p className="text-[11px] text-slate-600 font-semibold">Gracias por su pago puntual.</p>
          <p className="text-[11px] text-slate-600 font-semibold">Conserve este recibo como constancia.</p>
        </div>
      </div>
    </div>
  );
};

// --- ASISTENTE AI COMPONENT ---
const AIHelper = ({ chatHistory, setChatHistory, dbData, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  // Scroll to bottom on message update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  // Usar un resumen estructurado y legible de los datos de la aplicación para dar contexto al asesor financiero
  const getContextualData = () => {
    const clientsCount = dbData.clients.length;
    const activeLoans = dbData.loans.filter(l => l.status === 'ACTIVE').length;
    const totalLent = dbData.loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalExpenses = dbData.expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalReceipts = dbData.receipts.length;
    const employeesCount = dbData.employees ? dbData.employees.length : 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const pendingCollections = dbData.loans.flatMap(loan => 
      loan.schedule
        .filter(s => s.status !== 'PAID' && new Date(s.date) <= today)
        .map(s => ({
          loanId: loan.id,
          date: s.date,
          payment: s.payment
        }))
    ).sort((a,b) => new Date(a.date) - new Date(b.date));

    const pendingSummary = pendingCollections.slice(0, 5).map(p => ({
      loanId: p.loanId.substr(0, 6),
      date: formatDate(p.date),
      amount: formatCurrency(p.payment)
    }));

    const pendingLines = pendingSummary.length
      ? pendingSummary.map(p => `- ${p.date}: ${p.amount} (Préstamo ${p.loanId})`).join('\n')
      : '- Ninguno (no hay cobros vencidos o de hoy).';

    return `Indicadores financieros actuales (uso interno del asistente):\n\n` +
      `- Total de clientes: ${clientsCount}\n` +
      `- Préstamos activos: ${activeLoans}\n` +
      `- Monto total prestado (capital): ${formatCurrency(totalLent)}\n` +
      `- Gastos totales acumulados: ${formatCurrency(totalExpenses)}\n` +
      `- Recibos de pago registrados: ${totalReceipts}\n` +
      `- Empleados registrados: ${employeesCount}\n` +
      `- Próximos 5 cobros pendientes:\n${pendingLines}`;
  };

  const systemInstruction = `Eres un asesor financiero virtual para Renace.tech, una financiera de préstamos y cobranza.
Tu objetivo es ayudar al usuario a:
- Analizar el estado de la cartera de préstamos y la caja.
- Detectar clientes o préstamos de riesgo (mora, alta exposición, concentración).
- Sugerir acciones prácticas de cobranza, control de gastos y crecimiento sano del portafolio.
- Explicar conceptos financieros de forma sencilla cuando el usuario lo pida.

Tienes acceso a un resumen estructurado de los datos actuales del sistema:
${getContextualData()}

Instrucciones de comportamiento:
- Responde SIEMPRE en español, con un tono profesional, claro y directo.
- Cuando presentes un resumen de datos, usa una lista de puntos clara y fácil de leer, evita tablas Markdown y evita mostrar JSON directamente.
- Basa tus respuestas únicamente en los datos del sistema y en el mensaje del usuario.
- Cuando no haya datos suficientes para una conclusión, dilo explícitamente y propone qué información adicional haría falta.
- Cuando des recomendaciones financieras, indica que no reemplazan la asesoría legal, contable o regulatoria profesional.
- Nunca inventes números ni clientes; si algo no aparece en los datos, dilo.
- No intentes llamar funciones ni herramientas externas fuera de este contexto.`;
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      showToast('El Asistente AI no está configurado en esta instalación.', 'error');
      setLoading(false);
      return;
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const contents = [
      ...chatHistory.map(msg => ({ 
        role: msg.role === 'user' ? 'user' : 'model', 
        parts: [{ text: msg.text }] 
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      // Habilitar Google Search grounding para información externa, aunque la instrucción del sistema enfatiza los datos locales.
      tools: [{ "google_search": {} }], 
    };

    let responseData = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429) { // Too Many Requests
                    // Exponential backoff
                    const delay = Math.pow(2, attempts) * 1000;
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                    continue; // Go to next attempt
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            responseData = await response.json();
            break; // Success, exit loop

        } catch (error) {
            console.error("Error fetching AI response:", error);
            showToast('Error al conectar con el Asistente AI.', 'error');
            setLoading(false);
            return;
        }
    }
    
    setLoading(false);

    const candidate = responseData?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || 'Lo siento, no pude obtener una respuesta del modelo.';

    setChatHistory(prev => [...prev, { role: 'model', text }]);
  };

  return (
    <Card className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap size={20} className="text-blue-500"/> Asistente IA</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {/* Mensaje inicial */}
        {chatHistory.length === 0 && (
          <div className="bg-blue-50 p-4 rounded-xl text-sm border border-blue-200">
            <p className="font-semibold text-blue-800 mb-1">Hola, soy el Asistente IA de Renace.tech.</p>
            <p className="text-blue-700">Puedes preguntarme cosas como: "¿Cuál es el balance total prestado?" o "¿Cuántos clientes tenemos?"</p>
          </div>
        )}

        {/* Mensajes del chat */}
        {chatHistory.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3/4 p-3 rounded-xl ${
              message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}

        {/* Indicador de carga */}
        {loading && (
          <div className="flex justify-start">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl rounded-tl-none">
              <Loader2 size={20} className="animate-spin text-blue-500"/>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta..."
          className="flex-1 p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          className={`bg-blue-600 text-white p-3 rounded-xl transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          disabled={loading}
        >
          <Send size={20} />
        </button>
      </form>
    </Card>
  );
};

  const SolicitudesView = () => {
    // Reutilizamos formulario de creación de préstamos pero con otra acción
    const [form, setForm] = useState({ clientId: '', amount: '', rate: '', term: '', frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0] });

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Solicitudes de Crédito</h2>
          <button onClick={() => document.getElementById('reqForm').scrollIntoView()} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus size={18}/> Nueva Solicitud
          </button>
        </div>

        {/* Kanban Board Simple */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <h3 className="font-bold text-slate-600 uppercase text-sm tracking-wider flex items-center gap-2"><AlertCircle size={16}/> En Revisión</h3>
             {requests.filter(r => r.status === 'REVIEW').map(req => {
               const client = clients.find(c => c.id === req.clientId);
               return (
                 <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-2">
                       <span className="font-bold text-slate-800">{client?.name}</span>
                       <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Revisión</span>
                    </div>
                    <div className="text-sm text-slate-600 grid grid-cols-2 gap-2 mb-3">
                       <div>Monto: <span className="font-semibold">{formatCurrency(req.amount)}</span></div>
                       <div>Tasa: {req.rate}%</div>
                       <div>Plazo: {req.term} {req.frequency}</div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => approveRequest(req)} className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-teal-700">Aprobar</button>
                       <button onClick={() => rejectRequest(req)} className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200">Rechazar</button>
                    </div>
                 </div>
               );
             })}
             {requests.filter(r => r.status === 'REVIEW').length === 0 && <p className="text-center text-slate-400 py-4 text-sm">No hay solicitudes pendientes</p>}
          </div>

          <div id="reqForm">
             <Card>
                <h3 className="font-bold text-lg mb-4">Crear Nueva Solicitud</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <select className="flex-1 p-2 border rounded-lg bg-white" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                      <option value="">Seleccionar Cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setClientModalOpen(true)} className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200"><Plus/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Monto" className="p-2 border rounded-lg" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}/>
                    <input type="number" placeholder="Tasa %" className="p-2 border rounded-lg" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Plazo" className="p-2 border rounded-lg" value={form.term} onChange={e => setForm({...form, term: e.target.value})}/>
                    <select className="p-2 border rounded-lg" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                       <option>Diario</option><option>Semanal</option><option>Quincenal</option><option>Mensual</option>
                    </select>
                  </div>
                  <button onClick={() => { if(form.clientId) addRequest(form); }} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">Guardar Solicitud</button>
                </div>
             </Card>
          </div>
        </div>
      </div>
    );
  };

  const RutaView = () => {
    // Lógica de Ruta: Buscar clientes con cuotas PENDING que tengan fecha <= hoy
    const today = new Date();
    today.setHours(0,0,0,0);

    const pendingCollections = loans.flatMap(loan => {
       const client = clients.find(c => c.id === loan.clientId);
       const pendingInstallment = loan.schedule.find(s => s.status !== 'PAID');
       
       if (!pendingInstallment) return [];
       
       const dueDate = new Date(pendingInstallment.date);
       // Incluir si ya venció o vence hoy
       if (dueDate <= new Date()) {
          return [{
             ...pendingInstallment,
             loanId: loan.id,
             clientName: client?.name,
             clientAddress: client?.address,
             clientPhone: client?.phone,
             totalDue: pendingInstallment.payment + (dueDate < today ? 100 : 0) // Simulación de mora
          }];
       }
       return [];
    });

    // Agrupar por dirección (Simulación de optimización de ruta)
    const sortedRoute = pendingCollections.sort((a, b) => a.clientAddress?.localeCompare(b.clientAddress));

    return (
      <div className="space-y-6 animate-fade-in">
         <div className="flex justify-between items-center bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin/> Ruta Inteligente</h2>
               <p className="opacity-80">Optimización de cobros por zona</p>
            </div>
            <div className="text-right">
               <p className="text-3xl font-bold">{pendingCollections.length}</p>
               <p className="text-xs uppercase tracking-wider">Paradas Hoy</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
               {sortedRoute.map((stop, index) => (
                  <div key={stop.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-indigo-500 transition-colors">
                     <div className="flex items-center gap-4 w-full">
                        <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                        <div>
                           <h4 className="font-bold text-slate-800">{stop.clientName}</h4>
                           <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14}/> {stop.clientAddress}</p>
                           <p className="text-xs text-slate-400 mt-1">Cuota #{stop.number} • Vence: {formatDate(stop.date)}</p>
                        </div>
                     </div>
                     <div className="text-right w-full md:w-auto">
                        <p className="font-bold text-lg text-slate-800">{formatCurrency(stop.payment)}</p>
                        <button onClick={() => registerPayment(stop.loanId, stop.id)} className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-green-600 flex items-center justify-center gap-2">
                           <CheckCircle size={16}/> Cobrar
                        </button>
                     </div>
                  </div>
               ))}
               {sortedRoute.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                     <CheckCircle size={48} className="text-green-400 mx-auto mb-4"/>
                     <h3 className="text-lg font-bold text-slate-700">¡Ruta Completada!</h3>
                     <p className="text-slate-500">No hay cobros pendientes para hoy.</p>
                  </div>
               )
            </div>
            <div className="lg:col-span-1">
               <Card className="bg-slate-50 border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Resumen de Ruta</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total a Recaudar</span>
                        <span className="font-bold text-slate-800">{formatCurrency(sortedRoute.reduce((acc, i) => acc + i.payment, 0))}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Paradas Pendientes</span>
                        <span className="font-bold text-slate-800">{sortedRoute.length}</span>
                     </div>
                  </div>
               </Card>
          <MenuSection title="Operaciones">
             <MenuItem icon={Users} label="Clientes" active={activeTab==='clients'} onClick={()=>setActiveTab('clients')}/>
             <MenuItem icon={Wallet} label="Cobros" active={activeTab==='loans'} onClick={()=>setActiveTab('loans')}/>
             <MenuItem icon={FileText} label="Solicitudes" active={activeTab==='requests'} onClick={()=>setActiveTab('requests')}/>
             <MenuItem icon={Briefcase} label="Préstamos" active={activeTab==='loans'} onClick={()=>setActiveTab('loans')}/>
             <MenuItem icon={TrendingUp} label="Gastos" active={activeTab==='expenses'} onClick={()=>setActiveTab('expenses')}/>
          </MenuSection>

          <MenuSection title="Herramientas">
             <MenuItem icon={Zap} label="Asistente IA" active={activeTab==='ai'} onClick={()=>setActiveTab('ai')}/>
             <MenuItem icon={MapPin} label="Rutas & GPS" active={activeTab==='routes'} onClick={()=>setActiveTab('routes')}/>
             <MenuItem icon={ClipboardList} label="Notas" active={activeTab==='notes'} onClick={()=>setActiveTab('notes')}/>
             <MenuItem icon={Printer} label="Reportes" active={activeTab==='reports'} onClick={()=>setActiveTab('reports')}/>
             <MenuItem icon={Calculator} label="Simulador" active={activeTab==='calculator'} onClick={()=>setActiveTab('calculator')}/>
          </MenuSection>

          <MenuSection title="Administración">
             <MenuItem icon={Shield} label="Token Seguridad" onClick={() => {
               const token = generateSecurityToken();
               setSecurityToken(token);
               showToast('Token de seguridad actualizado: ' + token);
             }}/>
             <MenuItem icon={BookOpen} label="Contabilidad" active={activeTab==='accounting'} onClick={()=>setActiveTab('accounting')}/>
             <MenuItem icon={UserCheck} label="RRHH" active={activeTab==='hr'} onClick={()=>setActiveTab('hr')}/>
             <MenuItem icon={Settings} label="Ajustes" active={activeTab==='settings'} onClick={()=>setActiveTab('settings')}/>
             <MenuItem icon={Video} label="Tutoriales" onClick={()=>window.open('https://youtube.com', '_blank')}/>
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
             <img src={logoSmall} alt="Presta Pro" className="w-7 h-7 rounded-lg object-contain" />
             <span className="font-bold text-slate-800">Presta Pro</span>
          </div>
          <h1 className="hidden md:block text-xl font-bold text-slate-800">{TAB_TITLES[activeTab] || 'Presta Pro'}</h1>
          <div className="flex items-center gap-4">
            <button className="bg-slate-100 p-2 rounded-full relative">
               <Bell size={20}/>
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
           {activeTab === 'dashboard' && (
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
           {activeTab === 'cuadre' && (
            <CuadreView receipts={receipts} expenses={expenses} />
          )}
           {activeTab === 'expenses' && (
             <ExpensesView expenses={expenses} addExpense={addExpense} />
           )}
           {activeTab === 'requests' && (
             <RequestsView
               requests={requests}
               clients={clients}
               addRequest={addRequest}
               approveRequest={approveRequest}
               rejectRequest={rejectRequest}
               onNewClient={() => setClientModalOpen(true)}
             />
           )}
           {activeTab === 'routes' && (
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
              includeFutureInstallments={systemSettings.includeFutureInstallmentsInRoutes}
            />
          )}
           {activeTab === 'notes' && (
             <NotesView
               notes={notes}
               setNotes={setNotes}
             />
           )}
           {activeTab === 'reports' && (
             <ReportsView loans={loans} expenses={expenses} />
           )}
           {activeTab === 'hr' && (
            <HRView
              employees={dbData.employees || []}
              onNewEmployee={() => setEmployeeModalOpen(true)}
            />
          )}
           {activeTab === 'accounting' && (
             <AccountingView
               loans={loans}
               expenses={expenses}
               receipts={receipts}
             />
           )}
           {activeTab === 'ai' && (
             <AIView
               chatHistory={chatHistory}
               setChatHistory={setChatHistory}
               dbData={dbData}
               showToast={showToast}
             />
           )}
           
           {activeTab === 'clients' && (
             <ClientsView
               clients={clients}
               loans={loans}
               selectedClientId={selectedClientId}
               onSelectClient={setSelectedClientId}
               onSelectLoan={(loanId) => {
                 setSelectedLoanId(loanId);
                 setActiveTab('loans');
               }}
               onNewClient={() => setClientModalOpen(true)}
             />
           )}
           {activeTab === 'loans' && (
             <LoansView
               loans={loans}
               clients={clients}
               registerPayment={registerPayment}
               selectedLoanId={selectedLoanId}
               onSelectLoan={setSelectedLoanId}
             />
           )}
           {activeTab === 'calculator' && <CalculatorView />}
           {activeTab === 'settings' && (
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col p-6 text-white md:hidden animate-fade-in backdrop-blur-sm overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold">Menú</span>
              <button onClick={() => setMobileMenuOpen(false)}><X/></button>
           </div>
           {/* Replicate Sidebar Menu Items Here for Mobile */}
           <div className="space-y-1">
             <button onClick={() => {setActiveTab('dashboard'); setMobileMenuOpen(false); }} className="w-full py-3 border-b border-slate-700 text-left flex items-center gap-3"><LayoutDashboard size={18}/> Dashboard</button>
             <button onClick={() => {setActiveTab('cuadre'); setMobileMenuOpen(false); }} className="w-full py-3 border-b border-slate-700 text-left flex items-center gap-3"><Banknote size={18}/> Cuadre de Caja</button>

             <div className="pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Operaciones</div>
             <button onClick={() => {setActiveTab('clients'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Users size={18}/> Clientes</button>
             <button onClick={() => {setActiveTab('loans'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Wallet size={18}/> Préstamos y Cobros</button>
             <button onClick={() => {setActiveTab('requests'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><FileText size={18}/> Solicitudes</button>
             <button onClick={() => {setActiveTab('expenses'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><TrendingUp size={18}/> Gastos</button>

             <div className="pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Herramientas</div>
             <button onClick={() => {setActiveTab('ai'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Zap size={18}/> Asistente AI</button>
             <button onClick={() => {setActiveTab('routes'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><MapPin size={18}/> Rutas</button>
             <button onClick={() => {setActiveTab('notes'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><ClipboardList size={18}/> Notas</button>
             <button onClick={() => {setActiveTab('reports'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Printer size={18}/> Reportes</button>
             <button onClick={() => {setActiveTab('calculator'); setMobileMenuOpen(false); }} className="w-full py-2 text-left flex items-center gap-3"><Calculator size={18}/> Simulador</button>

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
              className={`flex flex-col items-center text-[10px] font-medium ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 ${
                  isActive ? 'bg-blue-50' : 'bg-slate-100'
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

// Helper Components for Menu
const MenuSection = ({ title, children }) => (
  <div className="mb-2">
    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">{title}</p>
    {children}
  </div>
);

const MenuItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
      active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={18} className="mr-3" /> {label}
  </button>
);

export default App;