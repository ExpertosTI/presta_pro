import React, { useState, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Download, Calendar, Filter, TrendingUp, TrendingDown,
  Target, AlertTriangle, CheckCircle, FileSpreadsheet, X,
  ChevronLeft, ChevronRight, Lock
} from 'lucide-react';
import { generateReceiptPDF } from '../../../services/pdfService';

function CuadreView({
  receipts = [],
  expenses = [],
  clients = [],
  collectors = [],
  routeClosings = [],
  loans = [],
  dailyGoal = 0,
  onCloseCash
}) {
  // MEJORA 1: Selector de fecha
  const [selectedDate, setSelectedDate] = useState(new Date());
  // MEJORA 7: Filtro por cobrador
  const [selectedCollector, setSelectedCollector] = useState('ALL');
  // MEJORA 4: Modal de cerrar caja
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingDetail, setClosingDetail] = useState(null);

  // Calculate date ranges
  const startOfSelectedDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const endOfSelectedDay = useMemo(() => {
    const d = new Date(startOfSelectedDay);
    d.setDate(d.getDate() + 1);
    return d;
  }, [startOfSelectedDay]);

  // MEJORA 8: Yesterday's date for comparison
  const startOfYesterday = useMemo(() => {
    const d = new Date(startOfSelectedDay);
    d.setDate(d.getDate() - 1);
    return d;
  }, [startOfSelectedDay]);

  // MEJORA 3: Filter out receipts from archived loans
  const activeReceipts = useMemo(() => {
    const archivedLoanIds = new Set(loans.filter(l => l.archived).map(l => l.id));
    return receipts.filter(r => !archivedLoanIds.has(r.loanId));
  }, [receipts, loans]);

  // Filter receipts by date and collector
  const receiptsFiltered = useMemo(() => {
    return activeReceipts.filter((r) => {
      const d = new Date(r.date);
      if (d < startOfSelectedDay || d >= endOfSelectedDay) return false;

      // MEJORA 7: Collector filter
      if (selectedCollector !== 'ALL') {
        const client = clients.find((c) => c.id === r.clientId);
        if (client?.collectorId !== selectedCollector) return false;
      }
      return true;
    });
  }, [activeReceipts, startOfSelectedDay, endOfSelectedDay, selectedCollector, clients]);

  // MEJORA 8: Yesterday's receipts for comparison
  const receiptsYesterday = useMemo(() => {
    const endOfYesterday = new Date(startOfSelectedDay);
    return activeReceipts.filter((r) => {
      const d = new Date(r.date);
      return d >= startOfYesterday && d < endOfYesterday;
    });
  }, [activeReceipts, startOfYesterday, startOfSelectedDay]);

  // Expenses filtered by date
  const expensesFiltered = useMemo(() => {
    return expenses.filter((g) => {
      if (!g.date) return false;
      const d = new Date(g.date);
      return d >= startOfSelectedDay && d < endOfSelectedDay;
    });
  }, [expenses, startOfSelectedDay, endOfSelectedDay]);

  // MEJORA 6: Group expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map();
    expensesFiltered.forEach(e => {
      const cat = e.category || 'Sin categoría';
      const current = map.get(cat) || { category: cat, total: 0, count: 0 };
      current.total += parseFloat(e.amount || 0);
      current.count += 1;
      map.set(cat, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expensesFiltered]);

  // Calculate totals
  const totalIngresos = receiptsFiltered.reduce((acc, r) => {
    const base = parseFloat(r.amount || 0) || 0;
    const penalty = parseFloat(r.penaltyAmount || 0) || 0;
    return acc + base + penalty;
  }, 0);

  // MEJORA 8: Yesterday's totals
  const totalIngresosYesterday = receiptsYesterday.reduce((acc, r) => {
    const base = parseFloat(r.amount || 0) || 0;
    const penalty = parseFloat(r.penaltyAmount || 0) || 0;
    return acc + base + penalty;
  }, 0);

  const incomeChange = totalIngresosYesterday > 0
    ? ((totalIngresos - totalIngresosYesterday) / totalIngresosYesterday * 100).toFixed(1)
    : null;

  const totalGastos = expensesFiltered.reduce(
    (acc, g) => acc + (parseFloat(g.amount || 0) || 0),
    0,
  );
  const balance = totalIngresos - totalGastos;

  const totalPenalty = receiptsFiltered.reduce(
    (acc, r) => acc + (parseFloat(r.penaltyAmount || 0) || 0),
    0,
  );
  const totalBaseIngresos = totalIngresos - totalPenalty;

  // MEJORA 9: Daily goal progress
  const goalProgress = dailyGoal > 0 ? Math.min((totalIngresos / dailyGoal) * 100, 100) : 0;

  // MEJORA 5: Last 7 days trend data
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfSelectedDay);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayReceipts = activeReceipts.filter(r => {
        const rd = new Date(r.date);
        return rd >= d && rd < nextD;
      });

      const dayTotal = dayReceipts.reduce((acc, r) => {
        return acc + parseFloat(r.amount || 0) + parseFloat(r.penaltyAmount || 0);
      }, 0);

      days.push({
        date: d,
        label: d.toLocaleDateString('es-DO', { weekday: 'short' }),
        total: dayTotal
      });
    }
    return days;
  }, [activeReceipts, startOfSelectedDay]);

  const maxTrend = Math.max(...trendData.map(d => d.total), 1);

  const lastReceipts = receiptsFiltered
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const lastExpenses = expensesFiltered
    .slice()
    .sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    })
    .slice(0, 5);

  // Collector breakdown
  const collectorMap = new Map();
  receiptsFiltered.forEach((r) => {
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
        receiptsCount: 0,
      });
    }
    const entry = collectorMap.get(collectorId);
    entry.totalAmount += total;
    entry.receiptsCount += 1;
  });

  const collectorsSummary = Array.from(collectorMap.values());

  const collectorsWithClosing = collectorsSummary.map((c) => {
    const lastClosing = routeClosings.find((cl) => cl.collectorId === c.id) || null;
    const closingAmount = lastClosing ? lastClosing.totalAmount || 0 : 0;
    const diff = c.totalAmount - closingAmount;
    return {
      ...c,
      lastClosing,
      closingAmount,
      diff,
    };
  });

  // MEJORA 10: Check for discrepancies
  const hasDiscrepancies = collectorsWithClosing.some(c => Math.abs(c.diff) > 0.01);

  const receiptsForClosing = useMemo(() => {
    if (!closingDetail) return [];
    const { collectorId, date } = closingDetail;
    if (!collectorId || !date) return [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return activeReceipts.filter((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      if (!client || client.collectorId !== collectorId) return false;
      const d = new Date(r.date);
      return d >= startOfDay && d < endOfDay;
    });
  }, [closingDetail, activeReceipts, clients]);

  const totalClosingAmountFromReceipts = useMemo(() => {
    return receiptsForClosing.reduce((acc, r) => {
      const base = parseFloat(r.amount || 0) || 0;
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + base + penalty;
    }, 0);
  }, [receiptsForClosing]);

  // MEJORA 2: Export to CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Cliente', 'Cuota', 'Mora', 'Total', 'Cobrador'];
    const rows = receiptsFiltered.map(r => {
      const client = clients.find(c => c.id === r.clientId);
      const collector = collectors.find(col => col.id === client?.collectorId);
      const base = parseFloat(r.amount || 0);
      const penalty = parseFloat(r.penaltyAmount || 0);
      return [
        formatDate(r.date),
        client?.name || 'Sin nombre',
        base.toFixed(2),
        penalty.toFixed(2),
        (base + penalty).toFixed(2),
        collector?.name || 'Sin asignar'
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cuadre_${formatDate(selectedDate).replace(/\//g, '-')}.csv`;
    link.click();
  };

  // Date navigation helpers
  const goToPreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  const isToday = startOfSelectedDay.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Date Selector and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cuadre de Caja</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isToday ? 'Hoy' : formatDate(selectedDate)}
          </p>
        </div>

        {/* MEJORA 1: Date Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={goToPreviousDay} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-1.5 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {!isToday && (
            <button onClick={goToToday} className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Hoy
            </button>
          )}

          {/* MEJORA 7: Collector Filter */}
          <select
            value={selectedCollector}
            onChange={(e) => setSelectedCollector(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl"
          >
            <option value="ALL">Todos los cobradores</option>
            {collectors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* MEJORA 2: Export Button */}
          <button
            onClick={exportToCSV}
            className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Exportar
          </button>
        </div>
      </div>

      {/* MEJORA 10: Discrepancy Alert */}
      {hasDiscrepancies && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle className="text-amber-600" size={20} />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Diferencias detectadas</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Hay discrepancias entre lo cobrado y el último cierre de ruta.</p>
          </div>
        </div>
      )}

      {/* Main KPIs */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">
            <p className="text-xs font-semibold uppercase tracking-wide">Ingresos</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalIngresos)}</p>
            {/* MEJORA 8: Comparison with yesterday */}
            {incomeChange !== null && (
              <p className={`text-xs flex items-center gap-1 mt-1 ${parseFloat(incomeChange) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {parseFloat(incomeChange) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {incomeChange}% vs ayer
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">
            <p className="text-xs font-semibold uppercase tracking-wide">Gastos</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalGastos)}</p>
            <p className="text-xs text-slate-500 mt-1">{expensesFiltered.length} movimientos</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide">Balance</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
            <p className="text-xs opacity-70 mt-1">{receiptsFiltered.length} cobros</p>
          </div>
          {/* MEJORA 9: Daily Goal */}
          {dailyGoal > 0 && (
            <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300">
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                <Target size={12} /> Meta diaria
              </p>
              <p className="mt-1 text-2xl font-bold">{goalProgress.toFixed(0)}%</p>
              <div className="h-2 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-violet-500" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="text-xs mt-1">{formatCurrency(totalIngresos)} / {formatCurrency(dailyGoal)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* MEJORA 5: Trend Chart */}
      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Tendencia últimos 7 días</h3>
        <div className="flex items-end gap-2 h-24">
          {trendData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-lg transition-all ${day.date.toDateString() === startOfSelectedDay.toDateString()
                    ? 'bg-blue-500'
                    : 'bg-emerald-500/70'
                  }`}
                style={{ height: `${Math.max((day.total / maxTrend) * 80, 4)}px` }}
                title={formatCurrency(day.total)}
              />
              <span className="text-[10px] text-slate-500">{day.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Income and Expense Details */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Detalle de ingresos
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cuotas (sin mora)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalBaseIngresos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mora cobrada</span>
                <span className="font-semibold text-amber-700 dark:text-amber-500">
                  {formatCurrency(totalPenalty)}
                </span>
              </div>
            </div>
          </div>
          {/* MEJORA 6: Expense Categories */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Gastos por categoría
            </p>
            <div className="mt-2 space-y-1 text-xs max-h-32 overflow-y-auto">
              {expensesByCategory.length === 0 ? (
                <p className="text-slate-500">No hay gastos</p>
              ) : (
                expensesByCategory.map((cat, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 truncate">{cat.category}</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-500">
                      {formatCurrency(cat.total)} ({cat.count})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Collector Breakdown */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Desglose por cobrador</h3>
          {/* MEJORA 4: Close Cash Button */}
          {isToday && onCloseCash && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2 text-sm bg-slate-900 dark:bg-slate-600 text-white rounded-xl hover:bg-slate-800 flex items-center gap-2"
            >
              <Lock size={16} /> Cerrar Caja
            </button>
          )}
        </div>
        {collectorsWithClosing.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No se han registrado cobros.</p>
        ) : (
          <div className="overflow-x-auto text-xs md:text-sm">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2 text-left">Cobrador</th>
                  <th className="p-2 text-right">Recibos</th>
                  <th className="p-2 text-right">Cobrado</th>
                  <th className="p-2 text-right">Último cuadre</th>
                  <th className="p-2 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {collectorsWithClosing.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{c.receiptsCount}</td>
                    <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(c.totalAmount)}</td>
                    <td className="p-2 text-right">
                      {c.lastClosing ? (
                        <button
                          type="button"
                          onClick={() => setClosingDetail({ collectorId: c.id, date: c.lastClosing.date, closingAmount: c.closingAmount })}
                          className="text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          {formatCurrency(c.closingAmount)}
                        </button>
                      ) : (
                        <span className="text-slate-400">{formatCurrency(c.closingAmount)}</span>
                      )}
                    </td>
                    <td
                      className={`p-2 text-right font-semibold ${c.diff === 0
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : c.diff > 0
                          ? 'text-amber-600 dark:text-amber-500'
                          : 'text-rose-600 dark:text-rose-500'
                        }`}
                    >
                      {formatCurrency(c.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Movimientos del día</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Últimos cobros</h4>
            {lastReceipts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No hay cobros registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {lastReceipts.map((r) => {
                  const client = clients.find((c) => c.id === r.clientId);
                  const clientName = client?.name || 'Cliente sin nombre';
                  const base = parseFloat(r.amount || 0) || 0;
                  const penalty = parseFloat(r.penaltyAmount || 0) || 0;
                  const total = base + penalty;
                  return (
                    <li
                      key={r.id}
                      className="py-2 flex justify-between items-center"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] md:max-w-[220px]">
                          {clientName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(r.date)} · {penalty > 0 ? 'Cuota + mora' : 'Cuota'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-500">
                          {formatCurrency(total)}
                        </p>
                        {penalty > 0 && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-500">
                            Mora {formatCurrency(penalty)}
                          </p>
                        )}
                        <button
                          onClick={() => generateReceiptPDF(r)}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ml-2 inline-block"
                          title="Descargar PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Últimos gastos</h4>
            {lastExpenses.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No hay gastos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {lastExpenses.map((g, idx) => {
                  const label = g.description || g.concept || g.category || `Gasto #${idx + 1}`;
                  const amount = parseFloat(g.amount || 0) || 0;
                  return (
                    <li
                      key={g.id || `${label}-${idx}`}
                      className="py-2 flex justify-between items-center"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] md:max-w-[220px]">
                          {label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {g.date ? formatDate(g.date) : 'Sin fecha'} · {g.category || 'Sin categoría'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-rose-700 dark:text-rose-500">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Closing Detail Modal */}
      {closingDetail && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Tickets cobrados en el cuadre</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Cobrador:{' '}
              <span className="font-semibold">
                {collectors.find(c => c.id === closingDetail.collectorId)?.name || 'Sin nombre'}
              </span>{' '}
              · Fecha: {formatDate(closingDetail.date)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Total de cierre (registro):{' '}
              <span className="font-semibold">{formatCurrency(closingDetail.closingAmount || 0)}</span>{' '}
              · Total por tickets listados:{' '}
              <span className="font-semibold">{formatCurrency(totalClosingAmountFromReceipts)}</span>
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              {receiptsForClosing.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                  No se encontraron tickets para este cuadre. Verifica la fecha o el cobrador.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-right">Cuota</th>
                      <th className="p-2 text-right">Mora</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {receiptsForClosing.map((r) => {
                      const base = parseFloat(r.amount || 0) || 0;
                      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
                      const total = base + penalty;
                      return (
                        <tr key={r.id}>
                          <td className="p-2 truncate max-w-[140px] text-slate-800 dark:text-slate-200">{r.clientName}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{formatDate(r.date)}</td>
                          <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(base)}</td>
                          <td className="p-2 text-right text-amber-600 dark:text-amber-500">{formatCurrency(penalty)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700 dark:text-emerald-500">{formatCurrency(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <button
              type="button"
              onClick={() => setClosingDetail(null)}
              className="mt-4 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MEJORA 4: Close Cash Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cerrar Caja</h3>
                <p className="text-sm text-slate-500">{formatDate(selectedDate)}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span>Ingresos</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(totalIngresos)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Gastos</span>
                  <span className="font-bold text-rose-600">{formatCurrency(totalGastos)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 my-2 pt-2 flex justify-between">
                  <span className="font-semibold">Balance Final</span>
                  <span className="font-bold text-lg">{formatCurrency(balance)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (onCloseCash) {
                      onCloseCash({
                        date: selectedDate,
                        totalIncome: totalIngresos,
                        totalExpenses: totalGastos,
                        balance: balance,
                        receiptsCount: receiptsFiltered.length,
                        expensesCount: expensesFiltered.length
                      });
                    }
                    setShowCloseModal(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-900 dark:bg-slate-600 text-white rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Confirmar Cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CuadreView;
