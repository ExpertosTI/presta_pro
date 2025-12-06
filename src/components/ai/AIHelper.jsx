import React, { useState, useEffect, useRef } from 'react';
import { Zap, Loader2, Send } from 'lucide-react';
import Card from '../Card.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { sendMessageToAI } from '../../services/aiService';

// --- ASISTENTE AI COMPONENT ---
const AIHelper = ({ chatHistory, setChatHistory, dbData, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState('');
    const chatEndRef = useRef(null);

    // Scroll to bottom on message update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Usar un resumen estructurado y legible de los datos de la aplicación para dar contexto al asistente
    const getContextualData = () => {
        const clientsCount = dbData.clients.length;
        const activeLoans = dbData.loans.filter(l => l.status === 'ACTIVE').length;
        const totalLent = dbData.loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
        const totalExpenses = dbData.expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
        const totalReceipts = dbData.receipts.length;
        const employeesCount = dbData.employees ? dbData.employees.length : 0;

        // Ventana de hoy para movimientos diarios
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const receiptsToday = (dbData.receipts || []).filter((r) => {
            const d = new Date(r.date);
            return d >= startOfToday && d < endOfToday;
        });

        const expensesToday = (dbData.expenses || []).filter((g) => {
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

        // Próximos cobros pendientes (vencidos o de hoy)
        const pendingCollections = dbData.loans.flatMap(loan =>
            loan.schedule
                .filter(s => s.status !== 'PAID' && new Date(s.date) <= startOfToday)
                .map(s => ({
                    loanId: loan.id,
                    date: s.date,
                    payment: s.payment
                }))
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        const pendingSummary = pendingCollections.slice(0, 5).map(p => ({
            loanId: p.loanId.substr(0, 6),
            date: formatDate(p.date),
            amount: formatCurrency(p.payment)
        }));

        const pendingLines = pendingSummary.length
            ? pendingSummary.map(p => `- ${p.date}: ${p.amount} (Préstamo ${p.loanId})`).join('\n')
            : '- Ninguno (no hay cobros vencidos o de hoy).';

        // Desglose por cobrador (usado para preguntas de rutas y cuadre)
        const collectorMap = new Map();
        receiptsToday.forEach((r) => {
            const client = dbData.clients.find((c) => c.id === r.clientId);
            const collectorId = client?.collectorId || 'UNASSIGNED';
            const collectorName =
                collectorId === 'UNASSIGNED'
                    ? 'Sin asignar'
                    : (dbData.collectors || []).find((col) => col.id === collectorId)?.name || 'Sin nombre';

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

        // Últimos recibos detallados (cliente, monto, mora, cobrador)
        const lastReceipts = (dbData.receipts || [])
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        const lastReceiptsLines = lastReceipts.length
            ? lastReceipts
                .map((r) => {
                    const client = dbData.clients.find((c) => c.id === r.clientId);
                    const collector = client && dbData.collectors
                        ? dbData.collectors.find((col) => col.id === client.collectorId)
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

    const systemInstruction = `Eres la secretaria contable personal del dueño de Renace.tech, una financiera de préstamos y cobranzas.
Tu rol es ayudarle a entender, de forma rápida y simple, qué pasa con el dinero (pagos, caja, cobradores) usando SIEMPRE los datos del sistema.

Tienes acceso directo a este resumen interno de la app (clientes, préstamos, gastos, recibos, empleados, cobradores, rutas, etc.). Trátalo como si fuera la base de datos en tiempo real:
${getContextualData()}

Reglas de respuesta IMPORTANTES:
- Responde SIEMPRE en español, con tono cercano y coloquial (como una secretaria de confianza).
- Máximo 12 líneas por respuesta. Frases cortas, claras, sin párrafos eternos.
- NUNCA digas frases como "como inteligencia artificial no tengo acceso" ni sugieras entrar a otra web o sistema; responde SIEMPRE usando los datos del resumen anterior.
- Cuando pidan totales, listados o estados (clientes, préstamos, pagos, mora, caja, cobradores), calcula la respuesta usando exclusivamente los datos del resumen anterior.
- Si te piden CREAR algo (cliente, préstamo, gasto, solicitud, nota, ruta), no escribes directamente en la base; en su lugar, pide los datos faltantes y devuelve instrucciones muy concretas de qué formulario usar en la app y con qué valores llenar cada campo.
- No uses listas con guiones ni Markdown, ni muestres JSON o tablas. No inventes números que no se deriven de los datos anteriores.`;

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
        setInput('');
        setLoading(true);

        // Usar siempre la API key desde variables de entorno (AI Studio)
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            showToast('El Asistente AI no está configurado (Falta API Key).', 'error');
            setLoading(false);
            return;
        }

        try {
            const responseText = await sendMessageToAI(chatHistory, userMessage, systemInstruction, apiKey);
            setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error) {
            console.error("Error fetching AI response:", error);
            showToast('Error al conectar con el Asistente AI.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap size={20} className="text-blue-500" /> Asistente IA</h2>

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
                        <div className={`max-w-3/4 p-3 rounded-xl ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                            }`}>
                            <p className="whitespace-pre-wrap">{message.text}</p>
                        </div>
                    </div>
                ))}

                {/* Indicador de carga */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="p-3 bg-slate-100 text-slate-800 rounded-xl rounded-tl-none">
                            <Loader2 size={20} className="animate-spin text-blue-500" />
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

export default AIHelper;
