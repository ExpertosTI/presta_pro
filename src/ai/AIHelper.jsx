import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Loader2, Send, Trash2, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '../shared/utils/formatters';
import Card from '../shared/components/ui/Card';
import { sendMessageToAI } from '../services/aiService.js';
import api from '../services/api';

// Persistent history key
const CHAT_STORAGE_KEY = 'prestapro_chat_history';

// Renderizado: soporta **negritas**, limpia viñetas, y renderiza botones de acción
const renderMessageText = (text, onActionClick) => {
  if (!text) return null;

  const rawLines = text.split('\n');
  const lines = rawLines.slice(0, 20);

  const renderWithBold = (value) => {
    const segments = value.split('**');
    if (segments.length === 1) return value;
    return segments.map((segment, idx) =>
      idx % 2 === 1 && segment
        ? <strong key={`b-${idx}`} className="font-semibold">{segment}</strong>
        : segment
    );
  };

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\s*[-*]\s+/, '');
    return (
      <p key={`p-${index}`} className="text-sm leading-relaxed text-slate-800">
        {renderWithBold(cleaned)}
      </p>
    );
  });
};

// Extract and render action buttons from AI response
const ActionButtons = ({ text, onAction }) => {
  const actionRegex = /\[\[ACTION:(\w+)(?:\|([^\]]*))?\]\]/g;
  const actions = [];
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({ id: match[1], label: match[2] || match[1] });
  }
  if (actions.length === 0) return null;

  const actionLabels = {
    dashboard: 'Ir a Dashboard',
    clients: 'Ver Clientes',
    loans: 'Ver Préstamos',
    expenses: 'Ver Gastos',
    routes: 'Ir a Ruta de Cobros',
    cuadre: 'Cuadre de Caja',
    reports: 'Ver Reportes',
    requests: 'Ver Solicitudes',
    documents: 'Documentos',
    calc: 'Calculadora',
    notes: 'Notas',
    hr: 'RRHH',
    accounting: 'Contabilidad',
    settings: 'Configuración',
    notifications: 'Notificaciones',
    'collectors-manage': 'Cobradores',
    pricing: 'Suscripción',
    'print-last-receipt': 'Imprimir Recibo',
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.id)}
          className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
        >
          {action.label || actionLabels[action.id] || action.id}
        </button>
      ))}
    </div>
  );
};

export function AIHelper({
  chatHistory, setChatHistory, dbData, showToast,
  ownerName, companyName, notifications = [], onCreateNotification,
  onNavigate, onOpenNewClient, onOpenNewLoan, onPrintReceipt,
}) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  const companyFromSettings = dbData?.systemSettings?.companyName;
  const effectiveCompanyName = companyName || companyFromSettings || 'Presta Pro';
  const effectiveOwnerName = ownerName || effectiveCompanyName || 'dueño/a';

  // Persist chat to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory.slice(-100)));
      } catch (_) { /* quota exceeded — ignore */ }
    }
  }, [chatHistory]);

  // Load persisted chat on mount
  useEffect(() => {
    if (chatHistory.length === 0) {
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatHistory(parsed);
          }
        }
      } catch (_) { /* corrupted — ignore */ }
    }
  }, []);

  // Auto-scroll + show "scroll to bottom" button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (isNearBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    showToast('Historial limpiado.', 'info');
  };

  // Handle action from AI response
  const handleAction = (actionId) => {
    // Navigation actions
    const navTargets = [
      'dashboard', 'clients', 'loans', 'expenses', 'routes', 'cuadre',
      'reports', 'requests', 'documents', 'calc', 'notes', 'hr',
      'accounting', 'settings', 'notifications', 'collectors-manage', 'pricing',
    ];
    if (navTargets.includes(actionId) && onNavigate) {
      onNavigate(actionId);
      showToast(`Navegando a ${actionId}`, 'info');
      return;
    }
    if (actionId === 'new-client' && onOpenNewClient) {
      onOpenNewClient();
      return;
    }
    if (actionId === 'new-loan' && onOpenNewLoan) {
      onOpenNewLoan();
      return;
    }
    // Print actions
    if (actionId === 'print-last-receipt' && onPrintReceipt) {
      onPrintReceipt();
      return;
    }
  };

  const getContextualData = () => {
    const clients = dbData?.clients || [];
    const loans = dbData?.loans || [];
    const expenses = dbData?.expenses || [];
    const receipts = dbData?.receipts || [];
    const employees = dbData?.employees || [];
    const collectors = dbData?.collectors || [];
    const routeClosings = dbData?.routeClosings || [];
    const aiMetrics = dbData?.aiMetrics || null;

    const clientsCount = aiMetrics?.clientsCount ?? clients.length;
    const loansCount = aiMetrics?.loansCount ?? loans.length;
    const activeLoans = aiMetrics?.activeLoans ?? loans.filter(l => l.status === 'ACTIVE').length;
    const totalLent = aiMetrics?.totalLent ?? loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalReceipts = aiMetrics?.receiptsCount ?? receipts.length;
    const employeesCount = employees.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const receiptsToday = receipts.filter((r) => {
      const d = new Date(r.date);
      return d >= startOfToday && d < endOfToday;
    });

    const expensesToday = expenses.filter((g) => {
      if (!g.date) return true;
      const d = new Date(g.date);
      return d >= startOfToday && d < endOfToday;
    });

    const localTotalCollectedToday = receiptsToday.reduce((acc, r) => {
      const base = parseFloat(r.amount || 0) || 0;
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + base + penalty;
    }, 0);

    const localTotalPenaltyToday = receiptsToday.reduce((acc, r) => {
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + penalty;
    }, 0);

    const totalCollectedToday = aiMetrics?.today?.totalCollected ?? localTotalCollectedToday;
    const totalPenaltyToday = aiMetrics?.today?.totalPenalty ?? localTotalPenaltyToday;

    const totalExpensesToday = expensesToday.reduce((acc, g) => acc + (parseFloat(g.amount || 0) || 0), 0);
    const cashBalanceToday = totalCollectedToday - totalExpensesToday;

    const pendingCollections = loans
      .flatMap(loan =>
        (loan.schedule || [])
          .filter(s => s.status !== 'PAID' && new Date(s.date) <= startOfToday)
          .map(s => ({ loanId: loan.id, date: s.date, payment: s.payment }))
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const pendingSummary = pendingCollections.slice(0, 5).map(p => ({
      loanId: p.loanId.substr(0, 6),
      date: formatDate(p.date),
      amount: formatCurrency(p.payment),
    }));

    const pendingLines = pendingSummary.length
      ? pendingSummary.map(p => `- ${p.date}: ${p.amount} (Préstamo ${p.loanId})`).join('\n')
      : '- Ninguno (no hay cobros vencidos o de hoy).';

    const collectorMap = new Map();
    receiptsToday.forEach((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      const collectorId = client?.collectorId || 'UNASSIGNED';
      const collectorName =
        collectorId === 'UNASSIGNED'
          ? 'Sin asignar'
          : collectors.find((col) => col.id === collectorId)?.name || 'Sin nombre';

      const base = parseFloat(r.amount || 0) || 0;
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      const total = base + penalty;

      if (!collectorMap.has(collectorId)) {
        collectorMap.set(collectorId, {
          id: collectorId,
          name: collectorName,
          totalAmount: 0,
          penaltyAmount: 0,
          receiptsCount: 0,
        });
      }
      const entry = collectorMap.get(collectorId);
      entry.totalAmount += total;
      entry.penaltyAmount += penalty;
      entry.receiptsCount += 1;
    });

    const collectorsSummary = Array.from(collectorMap.values());
    const collectorsLines = collectorsSummary.length
      ? collectorsSummary
        .map((c) =>
          `- ${c.name}: ${formatCurrency(c.totalAmount)} (${c.receiptsCount} recibos, Mora: ${formatCurrency(c.penaltyAmount)})`
        )
        .join('\n')
      : '- No hay cobros registrados hoy.';

    const lastReceipts = receipts
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const lastReceiptsLines = lastReceipts.length
      ? lastReceipts
        .map((r) => {
          const client = clients.find((c) => c.id === r.clientId);
          const collector = client && collectors.length
            ? collectors.find((col) => col.id === client.collectorId)
            : null;
          const clientName = client?.name || 'Cliente sin nombre';
          const base = parseFloat(r.amount || 0) || 0;
          const penalty = parseFloat(r.penaltyAmount || 0) || 0;
          const total = base + penalty;
          const date = formatDate(r.date);
          const collectorName = collector?.name ? ` • Cobrador: ${collector.name}` : '';
          const moraText = penalty > 0 ? ` • Mora: ${formatCurrency(penalty)}` : '';
          return `- ${date}: Total ${formatCurrency(total)} (Cuota: ${formatCurrency(base)}${moraText}) • ${clientName}${collectorName}`;
        })
        .join('\n')
      : '- No hay recibos registrados aún.';

    return (
      `Indicadores financieros actuales (uso interno del asistente):\n\n` +
      `- Total de clientes: ${clientsCount}\n` +
      `- Préstamos activos: ${activeLoans}\n` +
      `- Monto total prestado (capital): ${formatCurrency(totalLent)}\n` +
      `- Gastos totales acumulados: ${formatCurrency(totalExpenses)}\n` +
      `- Recibos de pago registrados (histórico): ${totalReceipts}\n` +
      `- Empleados registrados: ${employeesCount}\n\n` +
      `Resumen diario de caja (hoy):\n` +
      `- Total cobrado hoy (cuotas + mora): ${formatCurrency(totalCollectedToday)}\n` +
      `- Mora cobrada hoy: ${formatCurrency(totalPenaltyToday)}\n` +
      `- Gastos del día: ${formatCurrency(totalExpensesToday)}\n` +
      `- Balance de caja del día (ingresos - gastos): ${formatCurrency(cashBalanceToday)}\n\n` +
      `Cobros de hoy por cobrador:\n${collectorsLines}\n\n` +
      `Próximos 5 cobros pendientes:\n${pendingLines}\n\n` +
      `Últimos recibos de pago registrados (máx. 10):\n${lastReceiptsLines}\n\n` +
      `NOTIFICACIONES (${notifications.length} total, ${notifications.filter(n => !n.read).length} sin leer):\n` +
      (notifications.slice(0, 5).length > 0
        ? notifications.slice(0, 5).map(n => `- [${n.read ? 'Leída' : 'NUEVA'}] ${n.title}: ${n.message?.substring(0, 50)}...`).join('\n')
        : '- No hay notificaciones recientes.') + '\n\n' +
      `CIERRES DE RUTA (${routeClosings.length} total):\n` +
      (routeClosings.slice(0, 3).length > 0
        ? routeClosings.slice(0, 3).map(c => `- ${formatDate(c.date)}: ${formatCurrency(c.totalAmount)} (${c.receiptsCount} recibos)`).join('\n')
        : '- No hay cierres registrados.')
    );
  };

  const systemInstruction = `Eres la secretaria contable personal del dueño de ${effectiveCompanyName}.
Tu objetivo es ser breve, directa y conversacional. NO des discursos largos.

Nombre del dueño: ${effectiveOwnerName}.
Datos actuales del sistema:
${getContextualData()}

REGLAS DE ORO:
1. RESPUESTAS CORTAS: Máximo 2-3 frases por turno. NO bloques de texto grandes.
2. CONVERSACIONAL: Si te piden algo complejo, da un resumen y PREGUNTA "¿Quieres ver el detalle?".
3. DATOS REALES: Usa los números de arriba. Si te preguntan "cuánto presté", responde con el dato exacto.
4. DETALLES A DEMANDA: Solo da listas detalladas si el usuario dice "dame detalles".
5. NO INVENTES: Si no está en los datos de arriba, di "No veo ese dato aquí".
6. TONO: Amigable, profesional, pero relajado.
7. ENVIAR CORREO: Si el usuario pide "envía un correo" o "mándamelo", AÑADE al final: [[SEND_EMAIL]].
8. AYUDA: Si preguntan cómo hacer algo, envíalos a **renace.tech/PrestApp**.
9. NOTIFICACIÓN: Si piden "notifica" o "avisa", AÑADE al final: [[SEND_NOTIFICATION:Título|Mensaje]].
10. LEER NOTIFICACIONES: Usa los datos de NOTIFICACIONES de arriba.

SUPERPODERES — ACCIONES DE LA APP:
Puedes ejecutar acciones en la app añadiendo etiquetas de acción en tu respuesta. El sistema las convertirá en botones clickeables.

ACCIONES DE NAVEGACIÓN (añade al final de tu respuesta):
- [[ACTION:dashboard|Ir al Dashboard]] — Abre el panel principal
- [[ACTION:clients|Ver Clientes]] — Abre la lista de clientes
- [[ACTION:loans|Ver Préstamos]] — Abre préstamos
- [[ACTION:expenses|Ver Gastos]] — Abre gastos
- [[ACTION:routes|Ir a Ruta de Cobros]] — Abre la ruta de cobros
- [[ACTION:cuadre|Cuadre de Caja]] — Abre el cuadre de caja
- [[ACTION:reports|Ver Reportes]] — Abre reportes financieros
- [[ACTION:requests|Ver Solicitudes]] — Abre solicitudes de préstamo
- [[ACTION:documents|Documentos]] — Abre documentos
- [[ACTION:calc|Calculadora]] — Abre calculadora financiera
- [[ACTION:notes|Notas]] — Abre notas
- [[ACTION:hr|RRHH]] — Abre recursos humanos
- [[ACTION:accounting|Contabilidad]] — Abre contabilidad
- [[ACTION:settings|Configuración]] — Abre configuración
- [[ACTION:notifications|Notificaciones]] — Abre notificaciones
- [[ACTION:collectors-manage|Cobradores]] — Abre gestión de cobradores
- [[ACTION:pricing|Suscripción]] — Abre planes
- [[ACTION:new-client|Registrar Cliente]] — Abre formulario de nuevo cliente
- [[ACTION:new-loan|Nuevo Préstamo]] — Abre formulario de nuevo préstamo

ACCIONES DE IMPRESIÓN:
- [[ACTION:print-last-receipt|Imprimir Último Recibo]] — Imprime el último recibo registrado

CUÁNDO USAR ACCIONES:
- Si el usuario dice "quiero ver mis clientes" → responde brevemente y añade [[ACTION:clients|Ver Clientes]]
- Si dice "llévame a gastos" → responde y añade [[ACTION:expenses|Ver Gastos]]
- Si dice "necesito registrar un cliente" → responde y añade [[ACTION:new-client|Registrar Cliente]]
- Si dice "cómo va la ruta" → da resumen y añade [[ACTION:routes|Ir a Cobros]]
- Si pregunta por préstamos → da info y añade [[ACTION:loans|Ver Préstamos]]
- Si dice "imprime recibo" o "imprime ticket" → responde y añade [[ACTION:print-last-receipt|Imprimir Recibo]]
- Puedes poner MÚLTIPLES acciones si es relevante.

Ejemplo:
Usuario: "Quiero ver cuánto se cobró hoy y luego ir a clientes"
Tú: "Hoy se han cobrado $5,000 en total. ¿Quieres ir a clientes?"
[[ACTION:clients|Ver Clientes]] [[ACTION:cuadre|Ver Cuadre]]`;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const text = await sendMessageToAI(chatHistory, userMessage, systemInstruction);

      let displayText = text;
      let shouldSendEmail = false;

      if (text.includes('[[SEND_EMAIL]]')) {
        displayText = text.replace('[[SEND_EMAIL]]', '').trim();
        shouldSendEmail = true;
      }

      // Clean action tags from display text (they'll render as buttons)
      const cleanForDisplay = displayText.replace(/\[\[ACTION:\w+(?:\|[^\]]*)?\]\]/g, '').trim();

      setChatHistory(prev => [...prev, { role: 'model', text: displayText, cleanText: cleanForDisplay }]);

      if (shouldSendEmail) {
        api.post('/notifications/send-report', {
          reportHtml: cleanForDisplay.replace(/\n/g, '<br/>'),
          subject: `Resumen Asistente - ${new Date().toLocaleDateString()}`
        })
          .then(() => showToast('Correo enviado exitosamente.', 'success'))
          .catch((err) => {
            console.error('Email error:', err);
            showToast('Error al enviar el correo.', 'error');
          });
      }

      // Check for notification command
      const notifMatch = displayText.match(/\[\[SEND_NOTIFICATION:([^|]+)\|([^\]]+)\]\]/);
      if (notifMatch && onCreateNotification) {
        const title = notifMatch[1].trim();
        const message = notifMatch[2].trim();

        try {
          await api.post('/notifications', { title, message, type: 'SYSTEM' });
          showToast('Notificación creada exitosamente.', 'success');
          if (onCreateNotification) onCreateNotification({ title, message, type: 'SYSTEM' });
        } catch (err) {
          console.error('Notification error:', err);
          showToast('Error al crear la notificación.', 'error');
        }
      }
    } catch (err) {
      console.error('Error fetching AI response:', err);
      const errorMsg = err?.response?.status === 503
        ? 'El Asistente IA no está configurado en el servidor.'
        : err?.response?.status === 429
          ? 'Demasiadas consultas. Espera un momento.'
          : 'Error al conectar con el Asistente AI.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Zap size={20} className="text-blue-500" /> Asistente IA
        </h2>
        {chatHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            title="Limpiar historial"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0 relative"
      >
        {chatHistory.length === 0 && (
          <div className="bg-blue-50 p-4 rounded-2xl text-sm border border-blue-200 shadow-sm">
            <p className="font-semibold text-blue-900 mb-1">Hola, soy el Asistente IA de {effectiveCompanyName}.</p>
            <p className="text-blue-800">Puedes preguntarme cosas como:</p>
            <ul className="mt-2 space-y-1 text-blue-900 list-disc list-inside">
              <li><strong>Tus préstamos</strong> y cuotas pendientes.</li>
              <li><strong>Pagos o cobranzas</strong> del día.</li>
              <li><strong>Indicadores financieros</strong> de la cartera.</li>
              <li><strong>"Llévame a clientes"</strong> — navegar a cualquier sección.</li>
              <li><strong>"Registra un cliente"</strong> — ejecutar acciones rápidas.</li>
            </ul>
          </div>
        )}

        {chatHistory.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm border text-sm space-y-1 ${message.role === 'user'
                ? 'bg-blue-600 text-white border-blue-500 rounded-br-none'
                : 'bg-slate-50 text-slate-900 border-slate-200 rounded-tl-none'
                }`}
            >
              {message.role === 'model' ? (
                <>
                  {renderMessageText(message.cleanText || message.text, handleAction)}
                  <ActionButtons text={message.text} onAction={handleAction} />
                </>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm border border-slate-200">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
        >
          <ChevronDown size={16} />
        </button>
      )}

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta..."
          className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
}

export default AIHelper;
