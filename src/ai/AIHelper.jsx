import React, { useState, useEffect, useRef } from 'react';
import { Zap, Loader2, Send } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import Card from '../components/Card.jsx';
import { sendMessageToAI } from '../services/aiService.js';

// Renderizado simple: sin Markdown, máximo 13 líneas, limpiando viñetas "- " o "* "
const renderMessageText = (text) => {
  if (!text) return null;

  const rawLines = text.split('\n');
  const lines = rawLines.slice(0, 13); // máximo 13 líneas visibles por mensaje

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\s*[-*]\s+/, '');
    return (
      <p key={`p-${index}`} className="text-sm leading-relaxed text-slate-800">
        {cleaned}
      </p>
    );
  });
};

export function AIHelper({ chatHistory, setChatHistory, dbData, showToast }) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getContextualData = () => {
    const clients = dbData?.clients || [];
    const loans = dbData?.loans || [];
    const expenses = dbData?.expenses || [];
    const receipts = dbData?.receipts || [];
    const employees = dbData?.employees || [];
    const collectors = dbData?.collectors || [];

    const clientsCount = clients.length;
    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
    const totalLent = loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalReceipts = receipts.length;
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

    const totalCollectedToday = receiptsToday.reduce((acc, r) => {
      const base = parseFloat(r.amount || 0) || 0;
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + base + penalty;
    }, 0);

    const totalPenaltyToday = receiptsToday.reduce((acc, r) => {
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + penalty;
    }, 0);

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
          `- ${c.name}: ${formatCurrency(c.totalAmount)} (${c.receiptsCount} recibos, Mora: ${formatCurrency(
            c.penaltyAmount
          )})`
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
      `Últimos recibos de pago registrados (máx. 10):\n${lastReceiptsLines}`
    );
  };

  const systemInstruction = `Eres la secretaria contable personal del dueño de Renace.tech, una financiera de préstamos y cobranza.
Tu rol principal es llevarle la contabilidad del día a día y ayudarle a entender, con claridad, todo lo que está pasando con:
- Los pagos que realizan los clientes.
- El dinero que entra y sale de caja.
- Lo que hacen los cobradores en sus rutas (cuánto cobran, a quiénes, y qué falta por cobrar).

Tienes acceso a un resumen estructurado de los datos actuales del sistema (cartera, gastos, recibos, empleados, cobradores, etc.):
${getContextualData()}

Instrucciones de comportamiento:
- Responde SIEMPRE en español, con tono de secretaria organizada, clara y directa.
- Prioriza explicar el flujo de dinero: quién pagó, cuánto se ha cobrado hoy, qué falta por cobrar y cómo van los cobradores.
- Cuando presentes un resumen, usa frases cortas en líneas separadas, sin usar Markdown (sin asteriscos **, sin guiones '-', sin tablas) y evita mostrar JSON directamente.
- No escribas más de 13 líneas por respuesta; si necesitas continuar, sugiere al usuario que haga otra pregunta de seguimiento.
- Cuando te pidan detalles sobre "mora", "ingresos de hoy", "caja" o "cobradores", utiliza los valores diarios incluidos en el contexto (total cobrado hoy, mora cobrada hoy, gastos del día, balance de caja y desglose por cobrador).
- Cuando te pidan "últimos pagos", "últimos recibos" o "detalles de pagos", lista cada recibo con fecha, monto total, desglose de cuota y mora, cliente y, si está disponible, el cobrador correspondiente.
- Basa tus respuestas únicamente en los datos del sistema y en el mensaje del usuario.
- Cuando no haya datos suficientes para una conclusión, dilo explícitamente y propone qué información adicional habría que registrar en el sistema.
- Cuando des recomendaciones financieras o de control interno, aclara que no sustituyen asesoría legal, contable o regulatoria profesional.
- Nunca inventes números, clientes ni cobradores; si algo no aparece en los datos, dilo de forma explícita.
- No intentes llamar funciones ni herramientas externas fuera de este contexto.`;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast('El Asistente AI no está configurado en esta instalación.', 'error');
        setLoading(false);
        return;
      }

      const text = await sendMessageToAI(chatHistory, userMessage, systemInstruction, apiKey);
      setChatHistory(prev => [...prev, { role: 'model', text }]);
    } catch (err) {
      console.error('Error fetching AI response:', err);
      showToast('Error al conectar con el Asistente AI.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Zap size={20} className="text-blue-500" /> Asistente IA
      </h2>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {chatHistory.length === 0 && (
          <div className="bg-blue-50 p-4 rounded-2xl text-sm border border-blue-200 shadow-sm">
            <p className="font-semibold text-blue-900 mb-1">Hola, soy el Asistente IA de Renace.tech.</p>
            <p className="text-blue-800">
              Puedes preguntarme cosas como:
            </p>
            <ul className="mt-2 space-y-1 text-blue-900 list-disc list-inside">
              <li><strong>Tus préstamos</strong> y cuotas pendientes.</li>
              <li><strong>Pagos o cobranzas</strong> del día.</li>
              <li><strong>Indicadores financieros</strong> de la cartera.</li>
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
                renderMessageText(message.text)
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl rounded-tl-none">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

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
          className={`bg-blue-600 text-white p-3 rounded-xl transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          disabled={loading}
        >
          <Send size={20} />
        </button>
      </form>
    </Card>
  );
}

export default AIHelper;
