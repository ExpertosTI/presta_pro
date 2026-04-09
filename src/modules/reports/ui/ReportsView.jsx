import React, { useMemo, useState, useRef } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate, escapeHtml } from '../../../shared/utils/formatters';
import { FileText, Download, Mail, Calendar, TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'custom', label: 'Personalizado' },
];

function getDateRange(period, customFrom, customTo) {
  const now = new Date();
  let start, end;
  if (period === 'today') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else {
    start = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    end = customTo ? new Date(customTo + 'T23:59:59') : new Date(now);
  }
  return { start, end };
}

export function ReportsView({ loans, expenses, receipts = [], clients = [], collectors = [], routeClosings = [], systemSettings, showToast }) {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sending, setSending] = useState(false);
  const reportRef = useRef(null);

  const stats = useMemo(() => {
    const { start, end } = getDateRange(period, customFrom, customTo);
    const inRange = (d) => { const dt = new Date(d); return dt >= start && dt <= end; };

    const periodReceipts = receipts.filter(r => inRange(r.date));
    const periodExpenses = expenses.filter(e => inRange(e.date));

    const totalCollected = periodReceipts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalPenalty = periodReceipts.reduce((s, r) => s + (parseFloat(r.penaltyAmount) || 0), 0);
    const totalExpenses = periodExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const balance = totalCollected + totalPenalty - totalExpenses;

    const totalCapital = loans.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const totalInterest = loans.reduce((s, l) => s + (parseFloat(l.totalInterest) || 0), 0);

    let overdueCount = 0;
    const now = new Date();
    activeLoans.forEach(loan => {
      (loan.schedule || []).forEach(inst => {
        if (inst.status !== 'PAID' && new Date(inst.date) < now) overdueCount++;
      });
    });

    // Collector performance
    const collectorStats = collectors.map(col => {
      const colClients = clients.filter(c => c.collectorId === col.id);
      const colClientIds = new Set(colClients.map(c => c.id));
      const colReceipts = periodReceipts.filter(r => colClientIds.has(r.clientId));
      const collected = colReceipts.reduce((s, r) => s + (parseFloat(r.amount) || 0) + (parseFloat(r.penaltyAmount) || 0), 0);
      return { name: col.name, clients: colClients.length, receipts: colReceipts.length, collected };
    }).sort((a, b) => b.collected - a.collected);

    // Expense by category
    const byCategory = {};
    periodExpenses.forEach(e => {
      const cat = e.category || 'OTHER';
      byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    return {
      totalCollected, totalPenalty, totalExpenses, balance, totalCapital,
      totalInterest, activeLoansCount: activeLoans.length, overdueCount,
      receiptsCount: periodReceipts.length, expensesCount: periodExpenses.length,
      collectorStats, byCategory, periodLabel: PERIODS.find(p => p.id === period)?.label || period,
    };
  }, [loans, expenses, receipts, clients, collectors, period, customFrom, customTo]);

  const generateReportHTML = () => {
    const rows = stats.collectorStats.map(c =>
      `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(c.name)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${c.receipts}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${formatCurrency(c.collected)}</td></tr>`
    ).join('');
    return `
      <h3>Reporte ${escapeHtml(stats.periodLabel)} — ${escapeHtml(systemSettings?.companyName || 'PrestaPro')}</h3>
      <p>Generado: ${new Date().toLocaleString()}</p>
      <hr/>
      <table style="width:100%;border-collapse:collapse">
        <tr><td><strong>Cobrado (cuotas)</strong></td><td style="text-align:right">${formatCurrency(stats.totalCollected)}</td></tr>
        <tr><td><strong>Mora cobrada</strong></td><td style="text-align:right">${formatCurrency(stats.totalPenalty)}</td></tr>
        <tr><td><strong>Gastos</strong></td><td style="text-align:right">${formatCurrency(stats.totalExpenses)}</td></tr>
        <tr style="font-size:1.2em"><td><strong>Balance</strong></td><td style="text-align:right;color:${stats.balance >= 0 ? '#059669' : '#dc2626'}"><strong>${formatCurrency(stats.balance)}</strong></td></tr>
      </table>
      <hr/>
      <p><strong>Cartera activa:</strong> ${formatCurrency(stats.totalCapital)} (${stats.activeLoansCount} préstamos)</p>
      <p><strong>Cuotas vencidas:</strong> ${stats.overdueCount}</p>
      <hr/>
      <h4>Rendimiento por Cobrador</h4>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Cobrador</th><th style="padding:8px;text-align:right">Recibos</th><th style="padding:8px;text-align:right">Cobrado</th></tr>
        ${rows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#94a3b8">Sin datos</td></tr>'}
      </table>
    `;
  };

  const handlePrintPDF = () => {
    const html = generateReportHTML();
    const win = window.open('', '_blank');
    if (!win) { showToast?.('Permite ventanas emergentes para generar el PDF', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Reporte ${stats.periodLabel}</title><style>body{font-family:sans-serif;padding:40px;color:#1e293b;max-width:700px;margin:auto}table{width:100%}hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0}h3{color:#1e293b}h4{color:#334155;margin-top:20px}</style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const html = generateReportHTML();
      await api.post('/notifications/send-report', {
        reportHtml: html,
        subject: `Reporte ${stats.periodLabel} — ${systemSettings?.companyName || 'PrestaPro'}`,
      });
      showToast?.('Reporte enviado a tu correo', 'success');
    } catch (e) {
      showToast?.('Error al enviar el reporte. Verifica tu email en el perfil.', 'error');
    } finally {
      setSending(false);
    }
  };

  const KPI = ({ icon: Icon, label, value, color = 'slate', sub }) => (
    <div className={`p-4 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800 overflow-hidden`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={`text-${color}-500`} />
        <p className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400`}>{label}</p>
      </div>
      <p className={`text-lg sm:text-xl font-bold text-${color}-800 dark:text-${color}-200 truncate tabular-nums`}>{value}</p>
      {sub && <p className={`text-xs text-${color}-500 mt-0.5`}>{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in" ref={reportRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText size={22} className="text-blue-500" /> Reportes
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrintPDF} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Download size={14} /> PDF
          </button>
          <button onClick={handleSendEmail} disabled={sending} className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
            <Mail size={14} /> {sending ? 'Enviando...' : 'Enviar al Correo'}
          </button>
        </div>
      </div>

      {/* Period selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p.id ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              style={period === p.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >{p.label}</button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-400">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
          )}
        </div>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={TrendingUp} label="Cobrado" value={formatCurrency(stats.totalCollected)} color="emerald" sub={`${stats.receiptsCount} recibos`} />
        <KPI icon={AlertTriangle} label="Mora Cobrada" value={formatCurrency(stats.totalPenalty)} color="amber" />
        <KPI icon={TrendingDown} label="Gastos" value={formatCurrency(stats.totalExpenses)} color="rose" sub={`${stats.expensesCount} gastos`} />
        <KPI icon={DollarSign} label="Balance" value={formatCurrency(stats.balance)} color={stats.balance >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={DollarSign} label="Capital Activo" value={formatCurrency(stats.totalCapital)} color="blue" sub={`${stats.activeLoansCount} préstamos`} />
        <KPI icon={TrendingUp} label="Interés Proyectado" value={formatCurrency(stats.totalInterest)} color="violet" />
        <KPI icon={AlertTriangle} label="Cuotas Vencidas" value={stats.overdueCount} color="rose" />
        <KPI icon={Users} label="Clientes" value={clients.length} color="blue" sub={`${collectors.length} cobradores`} />
      </div>

      {/* Collector Performance */}
      {stats.collectorStats.length > 0 && (
        <Card>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Users size={16} className="text-blue-500" /> Rendimiento por Cobrador
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2 text-left">Cobrador</th>
                  <th className="p-2 text-right">Clientes</th>
                  <th className="p-2 text-right">Recibos</th>
                  <th className="p-2 text-right">Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats.collectorStats.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{c.clients}</td>
                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{c.receipts}</td>
                    <td className="p-2 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(c.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Expense by Category */}
      {Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3">Gastos por Categoría</h3>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
              const pct = stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate">{cat}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums w-20 text-right">{formatCurrency(amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default ReportsView;
