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

// --- UTILS & HELPERS ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const safeLoad = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
    return parsed ?? defaultValue;
  } catch (e) {
    console.error('Error loading data from localStorage key', key, e);
    try { localStorage.removeItem(key); } catch {}
    return defaultValue;
  }
};

// Algoritmo de Amortización (Sistema Francés)
const calculateSchedule = (amount, rate, term, frequency, startDate) => {
  const schedule = [];
  let balance = parseFloat(amount);
  const annualRate = parseFloat(rate) / 100;
  
  let periodsPerYear = 12;
  let daysPerPeriod = 30;
  
  switch(frequency) {
    case 'Diario': periodsPerYear = 365; daysPerPeriod = 1; break;
    case 'Semanal': periodsPerYear = 52; daysPerPeriod = 7; break;
    case 'Quincenal': periodsPerYear = 24; daysPerPeriod = 15; break;
    case 'Mensual': periodsPerYear = 12; daysPerPeriod = 30; break;
    default: periodsPerYear = 12;
  }

  const ratePerPeriod = annualRate / periodsPerYear;
  const pmt = (amount * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -term));

  let currentDate = new Date(startDate);

  for (let i = 1; i <= term; i++) {
    const interest = balance * ratePerPeriod;
    const principal = pmt - interest;
    balance -= principal;
    currentDate.setDate(currentDate.getDate() + daysPerPeriod);

    schedule.push({
      id: generateId(),
      number: i,
      date: currentDate.toISOString().split('T')[0],
      payment: pmt,
      interest: interest,
      principal: principal,
      balance: balance < 0 ? 0 : balance,
      status: 'PENDING',
      paidAmount: 0,
      paidDate: null
    });
  }
  return schedule;
};

// --- COMPONENTS ---

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
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
};

// --- TICKET DE PAGO (IMPRESIÓN TÉRMICA) ---
const PaymentTicket = ({ receipt, companyName = "Renace.tech" }) => {
  if (!receipt) return null;
  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[100] p-4 font-mono text-black text-xs leading-tight">
      <div className="max-w-[80mm] mx-auto text-center">
        <h1 className="text-xl font-bold mb-1">{companyName}</h1>
        <p className="mb-2">RNC: 101-00000-1</p>
        <p className="mb-4 border-b border-black pb-2">RECIBO DE INGRESO</p>
        
        <div className="text-left mb-2">
          <p><strong>Recibo #:</strong> {receipt.id.substr(0,8).toUpperCase()}</p>
          <p><strong>Fecha:</strong> {formatDateTime(receipt.date)}</p>
          <p><strong>Cliente:</strong> {receipt.clientName}</p>
          <p><strong>Préstamo ID:</strong> {receipt.loanId.substr(0,6).toUpperCase()}</p>
        </div>

        <div className="border-y border-black py-2 my-2 text-left">
          <div className="flex justify-between font-bold text-sm">
            <span>MONTO PAGADO:</span>
            <span>{formatCurrency(receipt.amount)}</span>
          </div>
        </div>

        <div className="text-left mb-4">
          <p><strong>Cuota #:</strong> {receipt.installmentNumber}</p>
          <p><strong>Concepto:</strong> Pago de Cuota</p>
          <p><strong>Cobrador:</strong> Admin</p>
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px]">¡Gracias por su pago puntual!</p>
          <p className="text-[10px]">Conserve este recibo como constancia.</p>
          <p className="mt-4">__________________________</p>
          <p>Firma Autorizada</p>
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
  
  // Use a simplified version of the main application data for the AI context
  const getContextualData = () => {
    const clientsCount = dbData.clients.length;
    const activeLoans = dbData.loans.filter(l => l.status === 'ACTIVE').length;
    const totalLent = dbData.loans.reduce((acc, l) => acc + parseFloat(l.amount), 0);
    const totalExpenses = dbData.expenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
    
    // Get next 5 pending collections
    const today = new Date();
    today.setHours(0,0,0,0);
    const pendingCollections = dbData.loans.flatMap(loan => 
      loan.schedule.filter(s => s.status !== 'PAID' && new Date(s.date) <= today)
    ).sort((a,b) => new Date(a.date) - new Date(b.date));

    const pendingSummary = pendingCollections.slice(0, 5).map(p => ({
      loanId: p.loanId.substr(0, 5),
      date: formatDate(p.date),
      amount: formatCurrency(p.payment)
    }));

    return `
      Resumen de Datos de Renace.tech:
      - Total de Clientes Registrados: ${clientsCount}
      - Préstamos Activos: ${activeLoans}
      - Monto Total Prestado (Capital): ${formatCurrency(totalLent)}
      - Gastos Totales Acumulados: ${formatCurrency(totalExpenses)}
      - Próximos 5 Cobros Pendientes (Vencidos o Hoy): ${JSON.stringify(pendingSummary)}
    `;
  };

  const systemInstruction = `Eres un Asistente AI para Renace.tech, una financiera de préstamos. Tu objetivo es ayudar al usuario a analizar, resumir o aconsejar sobre los datos proporcionados.
    Tienes acceso a los siguientes datos de la aplicación para responder preguntas contextuales:
    ${getContextualData()}
    Responde siempre en español, con un tono profesional, claro y conciso. No inventes datos que no estén en el resumen proporcionado. No intentes llamar a ninguna función externa.`;
  
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

    setChatHistory(prev => [...prev, { role: 'model', text: text }]);
  };


  return (
    <Card className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap size={20} className="text-blue-500"/> Asistente AI (Gemini)</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {/* Initial message */}
        {chatHistory.length === 0 && (
            <div className="bg-blue-50 p-4 rounded-xl text-sm border border-blue-200">
                <p className="font-semibold text-blue-800 mb-1">Hola, soy el Asistente AI de Renace.tech.</p>
                <p className="text-blue-700">Puedes preguntarme cosas como: "¿Cuál es el balance total prestado?" o "¿Cuántos clientes tenemos?"</p>
            </div>
        )}

        {/* Chat Messages */}
        {chatHistory.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3/4 p-3 rounded-xl shadow-md ${
              message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl rounded-tl-none">
              <Loader2 size={20} className="animate-spin text-blue-500"/>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta..."
          className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

// --- MAIN APPLICATION ---

export default function RenaceTechApp() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [printReceipt, setPrintReceipt] = useState(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  
  // AI Chat State
  const [chatHistory, setChatHistory] = useState([]);

  // Persistence Keys (Using localStorage for this example, but noted Firestore is required for production)
  const [clients, setClients] = useState(() => safeLoad('rt_clients', []));
  const [loans, setLoans] = useState(() => safeLoad('rt_loans', []));
  const [expenses, setExpenses] = useState(() => safeLoad('rt_expenses', []));
  const [requests, setRequests] = useState(() => safeLoad('rt_requests', []));
  const [notes, setNotes] = useState(() => safeLoad('rt_notes', []));
  const [receipts, setReceipts] = useState(() => safeLoad('rt_receipts', []));

  // Data bundle for AI Helper
  const dbData = { clients, loans, expenses, requests, notes, receipts };

  // --- EFFECTS ---
  useEffect(() => localStorage.setItem('rt_clients', JSON.stringify(clients)), [clients]);
  useEffect(() => localStorage.setItem('rt_loans', JSON.stringify(loans)), [loans]);
  useEffect(() => localStorage.setItem('rt_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('rt_requests', JSON.stringify(requests)), [requests]);
  useEffect(() => localStorage.setItem('rt_notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('rt_receipts', JSON.stringify(receipts)), [receipts]);

  // --- ACTIONS ---
  
  const showToast = (msg, type = 'success') => {
    setShowNotification({ msg, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handlePrint = () => {
    window.print();
    setTimeout(() => setPrintReceipt(null), 1000); // Clear receipt after print dialog closes (approx)
  };

  const addClient = (data) => {
    setClients([...clients, { ...data, id: generateId(), score: 70 }]);
    showToast('Cliente registrado correctamente');
    setActiveTab('clients');
  };

  const addExpense = (data) => {
    setExpenses([...expenses, { ...data, id: generateId(), date: new Date().toISOString() }]);
    showToast('Gasto registrado');
  };

  const addRequest = (data) => {
    setRequests([...requests, { ...data, id: generateId(), status: 'REVIEW', date: new Date().toISOString() }]);
    showToast('Solicitud enviada a revisión');
  };

  const approveRequest = (req) => {
    // Convert request to loan
    createLoan(req);
    // Remove from requests or mark approved
    setRequests(requests.map(r => r.id === req.id ? {...r, status: 'APPROVED'} : r));
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
      schedule: schedule,
      totalInterest: schedule.reduce((acc, item) => acc + item.interest, 0),
      totalPaid: 0
    };
    setLoans([newLoan, ...loans]);
    showToast('Préstamo creado exitosamente');
    setActiveTab('loans');
  };

  const registerPayment = (loanId, installmentId) => {
    const loan = loans.find(l => l.id === loanId);
    const installment = loan.schedule.find(i => i.id === installmentId);
    const client = clients.find(c => c.id === loan.clientId);

    if (!installment || !client) return;

    // Create Receipt
    const newReceipt = {
      id: generateId(),
      date: new Date().toISOString(),
      loanId: loan.id,
      clientId: client.id,
      clientName: client.name,
      amount: installment.payment,
      installmentNumber: installment.number
    };

    setReceipts([newReceipt, ...receipts]);

    // Update Loan
    setLoans(loans.map(l => {
      if (l.id !== loanId) return l;
      const updatedSchedule = l.schedule.map(inst => {
        if (inst.id === installmentId) {
          return { ...inst, status: 'PAID', paidAmount: inst.payment, paidDate: new Date().toISOString() };
        }
        return inst;
      });
      const allPaid = updatedSchedule.every(i => i.status === 'PAID');
      return {
        ...l,
        schedule: updatedSchedule,
        totalPaid: l.totalPaid + installment.payment,
        status: allPaid ? 'PAID' : 'ACTIVE'
      };
    }));

    // Trigger Print
    setPrintReceipt(newReceipt);
    setTimeout(handlePrint, 100); 
    showToast('Pago cobrado y recibo generado');
  };

  // --- SUB-VIEWS ---

  const ClientModal = () => {
    const [formData, setFormData] = useState({ name: '', dni: '', phone: '', address: '', email: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      addClient(formData);
      setClientModalOpen(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Registrar Nuevo Cliente</h3>
            <button onClick={() => setClientModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-600">Nombre Completo</label>
              <input required className="w-full p-3 border rounded-xl mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-600">Cédula / DNI</label>
                <input className="w-full p-3 border rounded-xl mt-1" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">Teléfono</label>
                <input className="w-full p-3 border rounded-xl mt-1" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600">Dirección</label>
              <input className="w-full p-3 border rounded-xl mt-1" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">Guardar Cliente</button>
          </form>
        </div>
      </div>
    );
  };

  const ClientsView = () => {
    const [filter, setFilter] = useState('');
    
    const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(filter.toLowerCase()) || 
      c.dni?.includes(filter)
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Directorio de Clientes</h2>
          <button onClick={() => setClientModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus size={18}/> Nuevo Cliente
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="relative mb-4">
             <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
             <input 
               className="w-full pl-10 p-3 border rounded-xl bg-slate-50" 
               placeholder="Buscar por nombre o cédula..." 
               value={filter}
               onChange={e => setFilter(e.target.value)}
             />
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-600">
                 <tr>
                   <th className="p-3 rounded-l-lg">Cliente</th>
                   <th className="p-3">Cédula</th>
                   <th className="p-3">Teléfono</th>
                   <th className="p-3">Dirección</th>
                   <th className="p-3 rounded-r-lg text-center">Score</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredClients.map(c => (
                   <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-3 font-bold text-slate-700">{c.name}</td>
                     <td className="p-3 text-slate-500">{c.dni || 'N/A'}</td>
                     <td className="p-3 text-slate-500">{c.phone || 'N/A'}</td>
                     <td className="p-3 text-slate-500 truncate max-w-[200px]">{c.address || 'N/A'}</td>
                     <td className="p-3 text-center">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                         {c.score}
                       </span>
                     </td>
                   </tr>
                 ))}
                 {filteredClients.length === 0 && (
                   <tr><td colSpan="5" className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  };

  const LoansView = () => {
    const [filterStatus, setFilterStatus] = useState('ACTIVE');
    const [selectedLoan, setSelectedLoan] = useState(null);

    const filteredLoans = loans.filter(l => 
      filterStatus === 'ALL' ? true : l.status === filterStatus
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Préstamos</h2>
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
             {['ACTIVE', 'PAID', 'ALL'].map(status => (
               <button 
                 key={status}
                 onClick={() => setFilterStatus(status)}
                 className={`px-4 py-1 rounded-md text-xs font-bold transition-colors ${filterStatus === status ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                 {status === 'ALL' ? 'TODOS' : status === 'ACTIVE' ? 'ACTIVOS' : 'PAGADOS'}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* LIST */}
           <div className="lg:col-span-1 space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {filteredLoans.map(loan => {
                const client = clients.find(c => c.id === loan.clientId);
                const percentPaid = Math.round((loan.totalPaid / (loan.amount + loan.totalInterest)) * 100);
                return (
                  <div 
                    key={loan.id} 
                    onClick={() => setSelectedLoan(loan)}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${selectedLoan?.id === loan.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <h4 className="font-bold text-slate-800">{client?.name || 'Cliente Desconocido'}</h4>
                           <p className="text-xs text-slate-400">ID: {loan.id.substr(0,6)}</p>
                        </div>
                        <Badge status={loan.status} />
                     </div>
                     <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Monto:</span>
                        <span className="font-bold text-slate-700">{formatCurrency(loan.amount)}</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${percentPaid}%` }}></div>
                     </div>
                     <p className="text-xs text-right mt-1 text-slate-400">{percentPaid}% Pagado</p>
                  </div>
                );
              })}
              {filteredLoans.length === 0 && <p className="text-center text-slate-400 py-10">No hay préstamos en esta categoría.</p>}
           </div>

           {/* DETAILS */}
           <div className="lg:col-span-2">
              {selectedLoan ? (
                 <Card className="h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                       <div>
                          <h3 className="text-xl font-bold text-slate-800">Detalle del Préstamo</h3>
                          <p className="text-slate-500 text-sm">Iniciado el {formatDate(selectedLoan.createdAt)}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm text-slate-500">Balance Pendiente</p>
                          <p className="text-2xl font-bold text-slate-800">{formatCurrency((parseFloat(selectedLoan.amount) + selectedLoan.totalInterest) - selectedLoan.totalPaid)}</p>
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                       <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-600 sticky top-0">
                             <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3 text-right">Cuota</th>
                                <th className="p-3 text-right">Estado</th>
                                <th className="p-3 text-center">Acción</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {selectedLoan.schedule.map(item => (
                                <tr key={item.id} className={item.status === 'PAID' ? 'bg-green-50/50' : ''}>
                                   <td className="p-3 font-bold text-slate-500">{item.number}</td>
                                   <td className="p-3">{formatDate(item.date)}</td>
                                   <td className="p-3 text-right font-medium">{formatCurrency(item.payment)}</td>
                                   <td className="p-3 text-right"><Badge status={item.status}/></td>
                                   <td className="p-3 text-center">
                                      {item.status !== 'PAID' && (
                                        <button 
                                          onClick={() => registerPayment(selectedLoan.id, item.id)}
                                          className="bg-green-100 text-green-700 p-1.5 rounded-lg hover:bg-green-200"
                                          title="Registrar Pago"
                                        >
                                          <DollarSign size={16}/>
                                        </button>
                                      )}
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </Card>
              ) : (
                 <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                    <p>Selecciona un préstamo para ver los detalles</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  };

  const CalculatorView = () => {
    const [simData, setSimData] = useState({ amount: 10000, rate: 10, term: 12, frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0] });
    const [schedule, setSchedule] = useState([]);

    useEffect(() => {
      if(simData.amount && simData.rate && simData.term) {
         setSchedule(calculateSchedule(simData.amount, simData.rate, simData.term, simData.frequency, simData.startDate));
      }
    }, [simData]);

    return (
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-1">
             <Card>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calculator size={20}/> Simulador</h3>
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1">Monto a Prestar</label>
                      <input type="number" className="w-full p-2 border rounded-lg" value={simData.amount} onChange={e => setSimData({...simData, amount: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-bold text-slate-600 mb-1">Tasa Interés %</label>
                         <input type="number" className="w-full p-2 border rounded-lg" value={simData.rate} onChange={e => setSimData({...simData, rate: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-sm font-bold text-slate-600 mb-1">Frecuencia</label>
                         <select className="w-full p-2 border rounded-lg bg-white" value={simData.frequency} onChange={e => setSimData({...simData, frequency: e.target.value})}>
                            <option>Diario</option><option>Semanal</option><option>Quincenal</option><option>Mensual</option>
                         </select>
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-600 mb-1">Plazo (Cuotas)</label>
                      <input type="number" className="w-full p-2 border rounded-lg" value={simData.term} onChange={e => setSimData({...simData, term: e.target.value})} />
                   </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <div className="flex justify-between mb-2 text-sm">
                      <span className="text-blue-800">Cuota Estimada:</span>
                      <span className="font-bold text-blue-800">{schedule.length > 0 ? formatCurrency(schedule[0].payment) : '$0.00'}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-blue-800">Total Interés:</span>
                      <span className="font-bold text-blue-800">{schedule.length > 0 ? formatCurrency(schedule.reduce((a,b)=>a+b.interest,0)) : '$0.00'}</span>
                   </div>
                </div>
             </Card>
          </div>
          
          <div className="lg:col-span-2">
             <Card className="h-full overflow-hidden flex flex-col">
                <h3 className="font-bold text-lg mb-4">Tabla de Amortización Proyectada</h3>
                <div className="flex-1 overflow-y-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0">
                         <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Fecha</th>
                            <th className="p-2 text-right">Cuota</th>
                            <th className="p-2 text-right">Interés</th>
                            <th className="p-2 text-right">Capital</th>
                            <th className="p-2 text-right">Saldo</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {schedule.map(item => (
                            <tr key={item.number}>
                               <td className="p-2 font-bold text-slate-500">{item.number}</td>
                               <td className="p-2">{formatDate(item.date)}</td>
                               <td className="p-2 text-right font-bold">{formatCurrency(item.payment)}</td>
                               <td className="p-2 text-right text-red-500">{formatCurrency(item.interest)}</td>
                               <td className="p-2 text-right text-green-600">{formatCurrency(item.principal)}</td>
                               <td className="p-2 text-right text-slate-500">{formatCurrency(item.balance)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>
          </div>
       </div>
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
                       <button onClick={() => approveRequest(req)} className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-teal-700">Aprobar</button>
                       <button onClick={() => rejectRequest(req)} className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-200">Rechazar</button>
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
               )}
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
                        <span className="text-slate-500">Clientes Visitados</span>
                        <span className="font-bold text-slate-800">0 / {sortedRoute.length}</span>
                     </div>
                     <hr className="border-slate-200"/>
                     <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa Visual</p>
                        <div className="h-40 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
                           [Mapa Google Maps Integrado]
                        </div>
                     </div>
                     <button onClick={() => window.print()} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold text-sm">Imprimir Hoja de Ruta</button>
                  </div>
               </Card>
            </div>
         </div>
      </div>
    );
  };

  const NotasView = () => {
    const [note, setNote] = useState('');
    const addNote = () => {
       if(!note) return;
       setNotes([...notes, { id: generateId(), text: note, date: new Date().toISOString() }]);
       setNote('');
    };

    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <Card>
           <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ClipboardList/> Bloc de Notas</h2>
           <div className="flex gap-2 mb-6">
              <input className="flex-1 p-3 border rounded-xl" placeholder="Escribe una nota rápida..." value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={addNote} className="bg-blue-600 text-white px-6 rounded-xl font-bold">Agregar</button>
           </div>
           <div className="space-y-3">
              {notes.map(n => (
                 <div key={n.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl relative group">
                    <p className="text-slate-800">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.date)}</p>
                    <button onClick={() => setNotes(notes.filter(x => x.id !== n.id))} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                 </div>
              ))}
              {notes.length === 0 && <p className="text-center text-slate-400">No hay notas guardadas.</p>}
           </div>
        </Card>
      </div>
    );
  };

  const ReportesView = () => {
    const [reportType, setReportType] = useState(null);
    
    const getReportContent = () => {
      if (!reportType) return null;
      
      const today = new Date();
      
      return (
         <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl flex flex-col shadow-2xl">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <div>
                     <h2 className="text-2xl font-bold text-slate-800">{reportType}</h2>
                     <p className="text-sm text-slate-500">Generado el {formatDateTime(today.toISOString())}</p>
                  </div>
                  <button onClick={() => setReportType(null)} className="p-2 hover:bg-slate-200 rounded-full"><X/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 font-mono text-sm">
                  <div className="text-center mb-8">
                     <h1 className="text-2xl font-bold uppercase tracking-widest mb-2">Renace.tech Financial Suite</h1>
                     <p className="text-slate-500">Reporte Oficial del Sistema</p>
                     <hr className="my-4 border-slate-300"/>
                  </div>
                  
                  {reportType === 'Reporte General de Cartera' && (
                     <table className="w-full text-left">
                        <thead className="border-b-2 border-black">
                           <tr>
                              <th className="py-2">Cliente</th>
                              <th className="py-2">Préstamo ID</th>
                              <th className="py-2 text-right">Monto Original</th>
                              <th className="py-2 text-right">Pagado</th>
                              <th className="py-2 text-right">Pendiente</th>
                              <th className="py-2 text-center">Estado</th>
                           </tr>
                        </thead>
                        <tbody>
                           {loans.map(l => {
                              const c = clients.find(x => x.id === l.clientId);
                              const balance = (l.amount + l.totalInterest) - l.totalPaid;
                              return (
                                 <tr key={l.id} className="border-b border-slate-100">
                                    <td className="py-2">{c?.name}</td>
                                    <td className="py-2">{l.id.substr(0,6)}</td>
                                    <td className="py-2 text-right">{formatCurrency(l.amount)}</td>
                                    <td className="py-2 text-right">{formatCurrency(l.totalPaid)}</td>
                                    <td className="py-2 text-right font-bold">{formatCurrency(balance)}</td>
                                    <td className="py-2 text-center">{l.status}</td>
                                 </tr>
                              );
                           })}
                           <tr className="font-bold bg-slate-100">
                              <td className="py-3" colSpan="2">TOTALES</td>
                              <td className="py-3 text-right">{formatCurrency(loans.reduce((a,b)=>a+b.amount,0))}</td>
                              <td className="py-3 text-right">{formatCurrency(loans.reduce((a,b)=>a+b.totalPaid,0))}</td>
                              <td className="py-3 text-right">{formatCurrency(loans.reduce((a,b)=>a + ((b.amount + b.totalInterest) - b.totalPaid), 0))}</td>
                              <td></td>
                           </tr>
                        </tbody>
                     </table>
                  )}

                  {/* Placeholder for other reports */}
                  {reportType !== 'Reporte General de Cartera' && (
                     <div className="text-center py-20 text-slate-400">
                        <p>Los datos detallados para "{reportType}" se están recopilando...</p>
                        <p className="mt-2">Este reporte estará disponible en la próxima actualización de datos.</p>
                     </div>
                  )}
                  
                  <div className="mt-12 text-center text-xs text-slate-400 border-t pt-4">
                     <p>Generado automáticamente por Presta Pro v1.4</p>
                     <p>Renace.tech - Todos los derechos reservados</p>
                  </div>
               </div>
               
               <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-4">
                  <button onClick={() => setReportType(null)} className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200">Cerrar</button>
                  <button onClick={() => window.print()} className="px-6 py-2 rounded-lg font-bold bg-slate-800 text-white hover:bg-slate-900 flex items-center gap-2"><Printer size={18}/> Imprimir Reporte</button>
               </div>
            </div>
         </div>
      );
    };

    return (
      <div className="animate-fade-in">
         {getReportContent()}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Reporte General de Cartera', 'Ingresos Mensuales', 'Clientes en Mora', 'Gastos Operativos', 'Proyección de Intereses', 'Historial de Pagos'].map((rep, i) => (
               <button key={i} onClick={() => setReportType(rep)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left group">
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                     <FileText size={24}/>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{rep}</h3>
                  <p className="text-xs text-slate-500">Ver y Descargar</p>
               </button>
            ))}
         </div>
      </div>
    );
  };

  const RRHHView = () => (
     <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold text-slate-800">Recursos Humanos</h2>
           <button className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18}/> Nuevo Empleado</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[{name: 'Admin User', role: 'Administrador', status: 'Activo'}, {name: 'Juan Pérez', role: 'Cobrador', status: 'Activo'}, {name: 'Maria Lopez', role: 'Secretaria', status: 'Vacaciones'}].map((emp, i) => (
              <Card key={i} className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">{emp.name.charAt(0)}</div>
                 <div>
                    <h4 className="font-bold text-slate-800">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${emp.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{emp.status}</span>
                 </div>
              </Card>
           ))}
        </div>
     </div>
  );

  const ContabilidadView = () => (
     <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800">Resumen Financiero</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
              <h3 className="font-bold mb-4 text-slate-700">Estado de Resultados (Estimado)</h3>
              <div className="space-y-3">
                 <div className="flex justify-between text-sm"><span className="text-slate-500">Ingresos por Intereses</span> <span className="font-bold text-green-600">+{formatCurrency(loans.reduce((a,b)=>a+b.totalInterest,0))}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500">Ingresos por Mora</span> <span className="font-bold text-green-600">+{formatCurrency(0)}</span></div>
                 <hr className="border-dashed"/>
                 <div className="flex justify-between text-sm"><span className="text-slate-500">Gastos Operativos</span> <span className="font-bold text-red-500">-{formatCurrency(expenses.reduce((a,b)=>a+parseFloat(b.amount),0))}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-500">Pérdidas por Incobrables</span> <span className="font-bold text-red-500">-{formatCurrency(0)}</span></div>
                 <div className="bg-slate-100 p-3 rounded-lg flex justify-between font-bold mt-4">
                    <span>Utilidad Neta</span>
                    <span className="text-blue-700">{formatCurrency(loans.reduce((a,b)=>a+b.totalInterest,0) - expenses.reduce((a,b)=>a+parseFloat(b.amount),0))}</span>
                 </div>
              </div>
           </Card>
           <Card>
              <h3 className="font-bold mb-4 text-slate-700">Balance General</h3>
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm border border-dashed rounded-lg">
                 Gráfico de Activos vs Pasivos
              </div>
           </Card>
        </div>
     </div>
  );
  
  const SettingsView = () => (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings/> Configuración del Sistema</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Empresa</label>
            <input className="w-full p-3 border rounded-xl" defaultValue="Renace.tech Financial Services" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Moneda Principal</label>
            <select className="w-full p-3 border rounded-xl bg-white">
              <option>Peso Dominicano (DOP)</option>
              <option>Dólar Estadounidense (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tasa de Mora por Defecto (%)</label>
            <input type="number" className="w-full p-3 border rounded-xl" defaultValue="5" />
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-bold text-slate-800 mb-2">Apariencia</h3>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-900 cursor-pointer ring-2 ring-offset-2 ring-slate-900"></div>
              <div className="w-10 h-10 rounded-full bg-blue-600 cursor-pointer"></div>
              <div className="w-10 h-10 rounded-full bg-teal-600 cursor-pointer"></div>
              <div className="w-10 h-10 rounded-full bg-purple-600 cursor-pointer"></div>
            </div>
          </div>
          <button onClick={() => showToast('Configuración guardada')} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900">Guardar Cambios</button>
        </div>
      </Card>
      <div className="mt-8 text-center">
         <p className="text-sm text-slate-400 font-medium">Powered by <span className="text-blue-600 font-bold">Renace.tech</span></p>
         <p className="text-xs text-slate-300">Versión 1.4.2 (Build 2024)</p>
      </div>
    </div>
  );
  
  const DashboardView = () => {
    // Recalcular stats
    const totalLent = loans.reduce((acc, l) => acc + parseFloat(l.amount), 0);
    const totalCollected = loans.reduce((acc, l) => acc + l.totalPaid, 0);
    return (
      <div className="space-y-6 animate-fade-in">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-600">
               <p className="text-xs font-bold text-slate-400 uppercase">Cartera Total</p>
               <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalLent)}</h3>
            </Card>
            <Card className="border-l-4 border-l-green-600">
               <p className="text-xs font-bold text-slate-400 uppercase">Recaudado</p>
               <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalCollected)}</h3>
            </Card>
            <Card className="border-l-4 border-l-orange-600">
               <p className="text-xs font-bold text-slate-400 uppercase">Por Cobrar</p>
               <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalLent * 1.2 - totalCollected)}</h3>
            </Card>
            <Card className="border-l-4 border-l-purple-600">
               <p className="text-xs font-bold text-slate-400 uppercase">Clientes Activos</p>
               <h3 className="text-2xl font-bold text-slate-800">{clients.length}</h3>
            </Card>
         </div>
         {/* Gráfico Simple Placeholder */}
         <Card className="h-64 flex items-center justify-center bg-slate-50 border-dashed">
            <p className="text-slate-400 font-medium">Gráfico de Rendimiento Financiero (Visual)</p>
         </Card>
      </div>
    );
  };
  
  // --- RENDER ---
  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 print:bg-white">
      {/* CLIENT MODAL */}
      {clientModalOpen && <ClientModal />}

      {/* TICKET PRINTER OVERLAY */}
      {printReceipt && <PaymentTicket receipt={printReceipt} />}

      {/* Sidebar - HIDDEN ON PRINT */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-2xl z-20 print:hidden">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-gradient-to-tr from-blue-600 to-teal-500 p-2.5 rounded-xl shadow-lg">
            <DollarSign size={24} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight block leading-none">Renace.tech</span>
            <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Financial Suite v1.4</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <MenuSection title="Tablero de Control">
             <MenuItem icon={LayoutDashboard} label="Dashboard" active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')}/>
             <MenuItem icon={Banknote} label="Cuadre de Caja" active={activeTab==='cuadre'} onClick={()=>setActiveTab('cuadre')}/>
          </MenuSection>
          
          <MenuSection title="Operaciones">
             <MenuItem icon={Users} label="Clientes" active={activeTab==='clients'} onClick={()=>setActiveTab('clients')}/>
             <MenuItem icon={Wallet} label="Cobros" active={activeTab==='loans'} onClick={()=>setActiveTab('loans')}/>
             <MenuItem icon={FileText} label="Solicitudes" active={activeTab==='requests'} onClick={()=>setActiveTab('requests')}/>
             <MenuItem icon={Briefcase} label="Préstamos" active={activeTab==='loans'} onClick={()=>setActiveTab('loans')}/>
             <MenuItem icon={TrendingUp} label="Gastos" active={activeTab==='expenses'} onClick={()=>setActiveTab('expenses')}/>
          </MenuSection>

          <MenuSection title="Herramientas">
             <MenuItem icon={Zap} label="Asistente AI" active={activeTab==='ai'} onClick={()=>setActiveTab('ai')}/>
             <MenuItem icon={MapPin} label="Rutas & GPS" active={activeTab==='routes'} onClick={()=>setActiveTab('routes')}/>
             <MenuItem icon={ClipboardList} label="Notas" active={activeTab==='notes'} onClick={()=>setActiveTab('notes')}/>
             <MenuItem icon={Printer} label="Reportes" active={activeTab==='reports'} onClick={()=>setActiveTab('reports')}/>
             <MenuItem icon={Calculator} label="Simulador" active={activeTab==='calculator'} onClick={()=>setActiveTab('calculator')}/>
          </MenuSection>

          <MenuSection title="Administración">
             <MenuItem icon={Shield} label="Token Seguridad" onClick={()=>showToast('Token generado: ' + Math.floor(100000 + Math.random() * 900000))}/>
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
             <button onClick={() => setMobileMenuOpen(true)}><Menu/></button>
             <span className="font-bold text-slate-800">Renace.tech</span>
          </div>
          <h1 className="hidden md:block text-xl font-bold text-slate-800 capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()}</h1>
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
           {activeTab === 'dashboard' && <DashboardView />}
           {activeTab === 'cuadre' && <CuadreView />}
           {activeTab === 'expenses' && <GastosView />}
           {activeTab === 'requests' && <SolicitudesView />}
           {activeTab === 'routes' && <RutaView />}
           {activeTab === 'notes' && <NotasView />}
           {activeTab === 'reports' && <ReportesView />}
           {activeTab === 'hr' && <RRHHView />}
           {activeTab === 'accounting' && <ContabilidadView />}
           {activeTab === 'ai' && (
             <AIHelper chatHistory={chatHistory} setChatHistory={setChatHistory} dbData={dbData} showToast={showToast} />
           )}
           
           {activeTab === 'clients' && <ClientsView />}
           {activeTab === 'loans' && <LoansView />}
           {activeTab === 'calculator' && <CalculatorView />}
           {activeTab === 'settings' && <SettingsView />}
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