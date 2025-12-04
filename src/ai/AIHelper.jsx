import React, { useState, useEffect, useRef } from 'react';
import { Zap, Loader2, Send } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import Card from '../components/Card.jsx';

// Renderizado simple de Markdown: negritas **texto**, listas y saltos de línea
const renderMessageText = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (keyBase) => {
    if (currentList.length === 0) return;
    elements.push(
      <ul key={`list-${keyBase}`} className="list-disc list-inside space-y-1 text-sm text-slate-800">
        {currentList.map((item, idx) => (
          <li key={`li-${keyBase}-${idx}`}>{item}</li>
        ))}
      </ul>
    );
    currentList = [];
  };

  const renderLineWithBold = (content, key) => {
    const segments = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push(content.slice(lastIndex, match.index));
      }
      segments.push(
        <strong key={`b-${key}-${segments.length}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push(content.slice(lastIndex));
    }

    return (
      <p key={`p-${key}`} className="text-sm leading-relaxed text-slate-800">
        {segments}
      </p>
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList(index);
      elements.push(<div key={`br-${index}`} className="h-2" />);
      return;
    }

    // Líneas tipo lista: empiezan con * o -
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const itemText = trimmed.slice(2);
      currentList.push(itemText);
      return;
    }

    // Si veníamos de una lista, cerrarla antes de agregar párrafo
    if (currentList.length > 0) {
      flushList(index);
    }

    elements.push(renderLineWithBold(line, index));
  });

  // Lista final si quedó algo pendiente
  flushList('end');

  return elements;
};

export function AIHelper({ chatHistory, setChatHistory, dbData, showToast }) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getContextualData = () => {
    const clientsCount = dbData.clients.length;
    const activeLoans = dbData.loans.filter(l => l.status === 'ACTIVE').length;
    const totalLent = dbData.loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalExpenses = dbData.expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalReceipts = dbData.receipts.length;
    const employeesCount = dbData.employees ? dbData.employees.length : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendingCollections = dbData.loans
      .flatMap(loan =>
        loan.schedule
          .filter(s => s.status !== 'PAID' && new Date(s.date) <= today)
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

    return (
      `Indicadores financieros actuales (uso interno del asistente):\n\n` +
      `- Total de clientes: ${clientsCount}\n` +
      `- Préstamos activos: ${activeLoans}\n` +
      `- Monto total prestado (capital): ${formatCurrency(totalLent)}\n` +
      `- Gastos totales acumulados: ${formatCurrency(totalExpenses)}\n` +
      `- Recibos de pago registrados: ${totalReceipts}\n` +
      `- Empleados registrados: ${employeesCount}\n` +
      `- Próximos 5 cobros pendientes:\n${pendingLines}`
    );
  };

  const systemInstruction = `Eres un asesor financiero virtual para Renace.tech, una financiera de préstamos y cobranza.\n\n${getContextualData()}`;

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
        parts: [{ text: msg.text }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const payload = {
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: [{ google_search: {} }],
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || 'Lo siento, no pude obtener una respuesta del modelo.';
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
              className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm border text-sm space-y-1 ${
                message.role === 'user'
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
          className={`bg-blue-600 text-white p-3 rounded-xl transition-colors ${
            loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
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
