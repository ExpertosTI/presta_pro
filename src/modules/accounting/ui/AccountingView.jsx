import React, { useState, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDateTime, formatDate } from '../../../shared/utils/formatters';
import { exportToPDF, exportToExcel } from '../../../shared/utils/reportExport';
import {
  FileText, FileSpreadsheet, Printer, Calendar, Filter, X,
  Search, TrendingUp, TrendingDown, Users, AlertTriangle,
  PieChart, BarChart3, DollarSign, Clock, CheckCircle
} from 'lucide-react';

// MEJORA 15: Date presets
const DATE_PRESETS = [
  { label: 'Hoy', getValue: () => { const t = new Date().toISOString().split('T')[0]; return { from: t, to: t }; } },
  {
    label: 'Semana', getValue: () => {
      const t = new Date();
      const s = new Date(t); s.setDate(t.getDate() - 7);
      return { from: s.toISOString().split('T')[0], to: t.toISOString().split('T')[0] };
    }
  },
  {
    label: 'Mes', getValue: () => {
      const t = new Date();
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return { from: s.toISOString().split('T')[0], to: t.toISOString().split('T')[0] };
    }
  },
  {
    label: 'Trimestre', getValue: () => {
      const t = new Date();
      const s = new Date(t); s.setMonth(t.getMonth() - 3);
      return { from: s.toISOString().split('T')[0], to: t.toISOString().split('T')[0] };
    }
  },
  {
    label: 'Año', getValue: () => {
      const t = new Date();
      const s = new Date(t.getFullYear(), 0, 1);
      return { from: s.toISOString().split('T')[0], to: t.toISOString().split('T')[0] };
    }
  },
  { label: 'Todo', getValue: () => ({ from: '', to: '' }) }
];

export function AccountingView({ loans = [], expenses = [], receipts = [], systemSettings = {}, routeClosings = [], clients = [], collectors = [] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // MEJORA 14: Search
  const [searchQuery, setSearchQuery] = useState('');
  // MEJORA 5: Collector filter
  const [collectorFilter, setCollectorFilter] = useState('ALL');

  // Filter data by date range
  const filteredReceipts = useMemo(() => {
    let result = receipts;
    if (dateFrom || dateTo) {
      result = result.filter(r => {
        const d = new Date(r.date);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }
    // MEJORA 14: Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [receipts, dateFrom, dateTo, searchQuery]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (dateFrom || dateTo) {
      result = result.filter(e => {
        if (!e.date) return true;
        const d = new Date(e.date);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.category || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [expenses, dateFrom, dateTo, searchQuery]);

  const filteredLoans = useMemo(() => {
    let result = loans;
    if (dateFrom || dateTo) {
      result = result.filter(l => {
        const d = new Date(l.createdAt || l.startDate);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }
    // Filter by collector if selected
    if (collectorFilter !== 'ALL') {
      result = result.filter(l => {
        const client = clients.find(c => c.id === l.clientId);
        return client?.collectorId === collectorFilter;
      });
    }
    return result;
  }, [loans, dateFrom, dateTo, collectorFilter, clients]);

  // Summary calculations
  const totalCapital = filteredLoans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalInteresProyectado = filteredLoans.reduce((acc, l) => acc + (l.totalInterest || 0), 0);
  const totalCobrado = filteredReceipts.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
  const totalGastos = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const utilidadNeta = totalCobrado - totalGastos;

  // MEJORA 13: ROI calculation
  const roi = totalCapital > 0 ? ((utilidadNeta / totalCapital) * 100).toFixed(2) : 0;

  // MEJORA 12: Portfolio by status
  const portfolioByStatus = useMemo(() => {
    const active = filteredLoans.filter(l => l.status === 'ACTIVE' || !l.status).length;
    const completed = filteredLoans.filter(l => l.status === 'COMPLETED').length;
    const cancelled = filteredLoans.filter(l => l.status === 'CANCELLED').length;
    const archived = filteredLoans.filter(l => l.status === 'ARCHIVED').length;
    return { active, completed, cancelled, archived };
  }, [filteredLoans]);

  // MEJORA 4: Delinquency report
  const delinquency = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdueAmount = 0;
    let overdueCount = 0;
    let clientsSet = new Set();

    filteredLoans.forEach(loan => {
      if (!loan.schedule) return;
      loan.schedule.forEach(s => {
        if (s.status !== 'PAID' && new Date(s.date) < today) {
          overdueAmount += s.payment || 0;
          overdueCount++;
          clientsSet.add(loan.clientId);
        }
      });
    });

    return { amount: overdueAmount, count: overdueCount, clients: clientsSet.size };
  }, [filteredLoans]);

  // MEJORA 8: Income projection
  const incomeProjection = useMemo(() => {
    const today = new Date();
    const next7 = new Date(today); next7.setDate(today.getDate() + 7);
    const next30 = new Date(today); next30.setDate(today.getDate() + 30);
    let in7days = 0;
    let in30days = 0;

    loans.forEach(loan => {
      if (!loan.schedule) return;
      loan.schedule.forEach(s => {
        if (s.status !== 'PAID') {
          const d = new Date(s.date);
          if (d >= today && d <= next7) in7days += s.payment || 0;
          if (d >= today && d <= next30) in30days += s.payment || 0;
        }
      });
    });

    return { in7days, in30days };
  }, [loans]);

  // MEJORA 3: Pie chart data
  const pieData = useMemo(() => {
    const total = totalCapital + totalInteresProyectado + totalGastos;
    if (total === 0) return [];
    return [
      { label: 'Capital', value: totalCapital, percent: ((totalCapital / total) * 100).toFixed(1), color: 'bg-blue-500' },
      { label: 'Interés', value: totalInteresProyectado, percent: ((totalInteresProyectado / total) * 100).toFixed(1), color: 'bg-emerald-500' },
      { label: 'Gastos', value: totalGastos, percent: ((totalGastos / total) * 100).toFixed(1), color: 'bg-rose-500' }
    ];
  }, [totalCapital, totalInteresProyectado, totalGastos]);

  // MEJORA 5: Stats by collector
  const collectorStats = useMemo(() => {
    const stats = {};
    collectors.forEach(c => {
      stats[c.id] = { name: c.name, collected: 0, pending: 0, loans: 0 };
    });

    filteredLoans.forEach(loan => {
      const client = clients.find(c => c.id === loan.clientId);
      if (client?.collectorId && stats[client.collectorId]) {
        stats[client.collectorId].loans++;
        const paid = loan.schedule?.filter(s => s.status === 'PAID').reduce((a, s) => a + (s.payment || 0), 0) || 0;
        const pending = loan.schedule?.filter(s => s.status !== 'PAID').reduce((a, s) => a + (s.payment || 0), 0) || 0;
        stats[client.collectorId].collected += paid;
        stats[client.collectorId].pending += pending;
      }
    });

    return Object.entries(stats).map(([id, data]) => ({ id, ...data })).filter(s => s.loans > 0);
  }, [collectors, filteredLoans, clients]);

  // MEJORA 7: Top clients
  const topClients = useMemo(() => {
    const clientDebts = {};
    filteredLoans.forEach(loan => {
      const client = clients.find(c => c.id === loan.clientId);
      if (!client) return;
      if (!clientDebts[client.id]) {
        clientDebts[client.id] = { name: client.name, totalDebt: 0, paid: 0 };
      }
      const pending = loan.schedule?.filter(s => s.status !== 'PAID').reduce((a, s) => a + (s.payment || 0), 0) || 0;
      const paid = loan.schedule?.filter(s => s.status === 'PAID').reduce((a, s) => a + (s.payment || 0), 0) || 0;
      clientDebts[client.id].totalDebt += pending;
      clientDebts[client.id].paid += paid;
    });

    const debtors = Object.values(clientDebts).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);
    const payers = Object.values(clientDebts).sort((a, b) => b.paid - a.paid).slice(0, 5);
    return { debtors, payers };
  }, [filteredLoans, clients]);

  // MEJORA 9: Balance general
  const balance = useMemo(() => {
    const capitalEnCartera = filteredLoans.reduce((acc, l) => {
      const pending = l.schedule?.filter(s => s.status !== 'PAID').reduce((a, s) => a + (s.payment || 0), 0) || 0;
      return acc + pending;
    }, 0);

    return {
      activos: totalCobrado + capitalEnCartera,
      pasivos: totalGastos,
      patrimonio: (totalCobrado + capitalEnCartera) - totalGastos,
      capitalEnCartera
    };
  }, [filteredLoans, totalCobrado, totalGastos]);

  const lastReceipts = filteredReceipts.slice(0, 6);
  const lastExpenses = filteredExpenses.slice(-6).reverse();

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setCollectorFilter('ALL');
  };

  const handleExportPDF = () => {
    exportToPDF({
      receipts: filteredReceipts,
      expenses: filteredExpenses,
      loans: filteredLoans,
      companyName: systemSettings.companyName || 'RenKredit',
      companyLogo: systemSettings.companyLogo,
      dateRange: dateFrom || dateTo ? { from: dateFrom || 'Inicio', to: dateTo || 'Hoy' } : null,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      receipts: filteredReceipts,
      expenses: filteredExpenses,
      loans: filteredLoans,
      companyName: systemSettings.companyName || 'RenKredit',
      dateRange: dateFrom || dateTo ? { from: dateFrom || 'Inicio', to: dateTo || 'Hoy' } : null,
    }, 'reportes');
  };

  const hasFilters = dateFrom || dateTo || searchQuery || collectorFilter !== 'ALL';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Reportes y Contabilidad
          </h2>
          {hasFilters && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filtrado: {dateFrom || 'Inicio'} → {dateTo || 'Hoy'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${showFilters || hasFilters
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
          >
            <Filter size={16} /> Filtros {hasFilters && '•'}
          </button>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold">
            <FileText size={16} /> PDF
          </button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs">
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-end gap-3">
            {/* MEJORA 15: Date presets */}
            <div className="flex gap-1 flex-wrap">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const v = preset.getValue();
                    setDateFrom(v.from);
                    setDateTo(v.to);
                  }}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold hover:bg-slate-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full p-1.5 rounded border text-xs" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full p-1.5 rounded border text-xs" />
            </div>
            {/* MEJORA 5: Collector filter */}
            {collectors.length > 0 && (
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Cobrador</label>
                <select
                  value={collectorFilter}
                  onChange={(e) => setCollectorFilter(e.target.value)}
                  className="w-full p-1.5 rounded border text-xs"
                >
                  <option value="ALL">Todos</option>
                  {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {/* MEJORA 14: Search */}
            <div className="flex-1 min-w-[150px] relative">
              <Search size={12} className="absolute left-2 top-1/2 mt-2 -translate-y-1/2 text-slate-400" />
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Buscar</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cliente, concepto..."
                className="w-full pl-7 p-1.5 rounded border text-xs"
              />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="px-2 py-1.5 rounded bg-rose-100 text-rose-600 text-xs font-semibold">
                <X size={14} />
              </button>
            )}
          </div>
        </Card>
      )}

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Capital Prestado</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(totalCapital)}</p>
          <p className="text-[10px] text-slate-400">{filteredLoans.length} préstamos</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Cobrado</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCobrado)}</p>
          <p className="text-[10px] text-slate-400">{filteredReceipts.length} recibos</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Gastos</p>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalGastos)}</p>
          <p className="text-[10px] text-slate-400">{filteredExpenses.length} gastos</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Utilidad Neta</p>
          <p className={`text-xl font-bold ${utilidadNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(utilidadNeta)}</p>
          {/* MEJORA 13: ROI */}
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            ROI: <span className={roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{roi}%</span>
          </p>
        </Card>
      </div>

      {/* MEJORA 4: Delinquency + MEJORA 8: Projection + MEJORA 12: Portfolio Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Morosidad</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(delinquency.amount)}</p>
          <p className="text-[10px] text-amber-600">{delinquency.count} cuotas vencidas • {delinquency.clients} clientes</p>
        </Card>

        <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-blue-600" />
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Proyección</p>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(incomeProjection.in7days)}</p>
              <p className="text-[10px] text-blue-600">Próx. 7 días</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-700">{formatCurrency(incomeProjection.in30days)}</p>
              <p className="text-[10px] text-blue-600">Próx. 30 días</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Cartera por Estado</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div className="flex justify-between"><span className="text-emerald-600">● Activos</span><span className="font-bold">{portfolioByStatus.active}</span></div>
            <div className="flex justify-between"><span className="text-blue-600">● Liquidados</span><span className="font-bold">{portfolioByStatus.completed}</span></div>
            <div className="flex justify-between"><span className="text-rose-600">● Cancelados</span><span className="font-bold">{portfolioByStatus.cancelled}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">● Archivados</span><span className="font-bold">{portfolioByStatus.archived}</span></div>
          </div>
        </Card>
      </div>

      {/* MEJORA 9: Balance General + MEJORA 3: Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-600" /> Balance General
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Capital en Cartera</span>
              <span className="font-semibold text-blue-600">{formatCurrency(balance.capitalEnCartera)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Efectivo Cobrado</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalCobrado)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">ACTIVOS</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(balance.activos)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">(-) Gastos Operativos</span>
              <span className="font-semibold text-rose-600">{formatCurrency(balance.pasivos)}</span>
            </div>
            <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-900/20 -mx-3 px-3 rounded">
              <span className="font-bold text-emerald-700 dark:text-emerald-300">PATRIMONIO NETO</span>
              <span className="font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(balance.patrimonio)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-violet-600" /> Distribución
          </h3>
          {pieData.length > 0 ? (
            <div className="space-y-2">
              {pieData.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.value)}</span>
                      <span className="text-xs text-slate-400 ml-1">({item.percent}%)</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Visual bar representation */}
              <div className="flex h-4 rounded-full overflow-hidden mt-2">
                {pieData.map(item => (
                  <div key={item.label} className={`${item.color}`} style={{ width: `${item.percent}%` }} title={`${item.label}: ${item.percent}%`} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">Sin datos</p>
          )}
        </Card>
      </div>

      {/* MEJORA 5: Collector Stats + MEJORA 7: Top Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collectorStats.length > 0 && (
          <Card>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" /> Por Cobrador
            </h3>
            <div className="space-y-2">
              {collectorStats.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.loans} préstamos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(c.collected)}</p>
                    <p className="text-[10px] text-slate-400">Pend: {formatCurrency(c.pending)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" /> Top Clientes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-rose-600 mb-1">Mayores Deudores</p>
              {topClients.debtors.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {topClients.debtors.map((c, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate text-slate-600 dark:text-slate-400">{c.name}</span>
                      <span className="font-semibold text-rose-600">{formatCurrency(c.totalDebt)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[10px] text-slate-400">Sin datos</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 mb-1">Mejores Pagadores</p>
              {topClients.payers.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {topClients.payers.map((c, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate text-slate-600 dark:text-slate-400">{c.name}</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(c.paid)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[10px] text-slate-400">Sin datos</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-3">Últimos Cobros</h3>
          {lastReceipts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Sin cobros en este período</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {lastReceipts.map((r, i) => (
                <li key={r.id || i} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{r.clientName}</p>
                    <p className="text-[10px] text-slate-500">{formatDate(r.date)} • Cuota #{r.installmentNumber}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{formatCurrency(parseFloat(r.amount || 0))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-3">Últimos Gastos</h3>
          {lastExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Sin gastos en este período</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {lastExpenses.map((e, i) => (
                <li key={e.id || i} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{e.category || 'Gasto'}</p>
                    <p className="text-[10px] text-slate-500">{e.description || e.notes || 'Sin descripción'}</p>
                  </div>
                  <span className="font-bold text-rose-600">{formatCurrency(parseFloat(e.amount || 0))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Route Closings */}
      {routeClosings && routeClosings.length > 0 && (
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-3">Historial de Cierres</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Cobrador</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">Recibos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {routeClosings.slice(0, 8).map((closing, i) => (
                  <tr key={closing.id || i}>
                    <td className="p-2">{formatDate(closing.date)}</td>
                    <td className="p-2 text-slate-600 dark:text-slate-400">{closing.collectorName || collectors.find(c => c.id === closing.collectorId)?.name || 'Cobrador'}</td>
                    <td className="p-2 text-right font-semibold text-emerald-600">{formatCurrency(closing.totalAmount || 0)}</td>
                    <td className="p-2 text-right text-slate-600">{closing.receiptsCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AccountingView;
