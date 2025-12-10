import React, { useState, useMemo } from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency, formatDateTime, formatDate } from '../shared/utils/formatters';
import { exportToPDF, exportToExcel } from '../shared/utils/reportExport';
import { FileText, FileSpreadsheet, Printer, Calendar, Filter, X } from 'lucide-react';

export function AccountingView({ loans = [], expenses = [], receipts = [], systemSettings = {}, routeClosings = [] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter data by date range
  const filteredReceipts = useMemo(() => {
    if (!dateFrom && !dateTo) return receipts;
    return receipts.filter(r => {
      const d = new Date(r.date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [receipts, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => {
    if (!dateFrom && !dateTo) return expenses;
    return expenses.filter(e => {
      if (!e.date) return true;
      const d = new Date(e.date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  const filteredLoans = useMemo(() => {
    if (!dateFrom && !dateTo) return loans;
    return loans.filter(l => {
      const d = new Date(l.createdAt || l.startDate);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [loans, dateFrom, dateTo]);

  const totalCapital = filteredLoans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalInteresProyectado = filteredLoans.reduce((acc, l) => acc + (l.totalInterest || 0), 0);
  const totalCobrado = filteredReceipts.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
  const totalGastos = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const utilidadNeta = totalCobrado - totalGastos;

  const lastReceipts = filteredReceipts.slice(0, 8);
  const lastExpenses = filteredExpenses.slice(-8).reverse();

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleExportPDF = () => {
    exportToPDF({
      receipts: filteredReceipts,
      expenses: filteredExpenses,
      loans: filteredLoans,
      companyName: systemSettings.companyName || 'Presta Pro',
      companyLogo: systemSettings.companyLogo,
      dateRange: dateFrom || dateTo ? { from: dateFrom || 'Inicio', to: dateTo || 'Hoy' } : null,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      receipts: filteredReceipts,
      expenses: filteredExpenses,
      loans: filteredLoans,
      companyName: systemSettings.companyName || 'Presta Pro',
      dateRange: dateFrom || dateTo ? { from: dateFrom || 'Inicio', to: dateTo || 'Hoy' } : null,
    }, 'contabilidad');
  };

  const hasFilters = dateFrom || dateTo;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Contabilidad</h2>
          {hasFilters && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando: {dateFrom || 'Inicio'} → {dateTo || 'Hoy'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors ${showFilters || hasFilters
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
          >
            <Filter size={16} /> Filtros {hasFilters && '•'}
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs md:text-sm font-semibold hover:bg-red-700 shadow-md"
          >
            <FileText size={16} /> PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs md:text-sm font-semibold hover:bg-emerald-700 shadow-md"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs md:text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDateFrom(today);
                  setDateTo(today);
                }}
                className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                  setDateFrom(startOfMonth);
                  setDateTo(today.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300"
              >
                Este Mes
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-xs font-semibold hover:bg-rose-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Capital Prestado</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(totalCapital)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{filteredLoans.length} préstamos</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Interés Proyectado</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(totalInteresProyectado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total según amortización</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Cobrado Acumulado</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCobrado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{filteredReceipts.length} recibos</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Utilidad Neta</p>
          <p className={`text-2xl font-bold ${utilidadNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(utilidadNeta)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Cobrado - Gastos</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-4">Últimos Cobros</h3>
          {lastReceipts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Sin cobros en este período</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {lastReceipts.map((r, i) => (
                <li key={r.id || i} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.clientName}</p>
                    <p className="text-xs text-slate-500">{formatDate(r.date)} • Cuota #{r.installmentNumber}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{formatCurrency(parseFloat(r.amount || 0))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-4">Últimos Gastos</h3>
          {lastExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Sin gastos en este período</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {lastExpenses.map((e, i) => (
                <li key={e.id || i} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{e.category || 'Gasto'}</p>
                    <p className="text-xs text-slate-500">{e.notes || e.description || 'Sin descripción'}</p>
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
          <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-4">Historial de Cierres de Ruta</h3>
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
                {routeClosings.slice(0, 10).map((closing, i) => (
                  <tr key={closing.id || i}>
                    <td className="p-2 text-slate-800 dark:text-slate-200">{formatDate(closing.date)}</td>
                    <td className="p-2 text-slate-600 dark:text-slate-400">{closing.collectorName || 'Cobrador'}</td>
                    <td className="p-2 text-right font-semibold text-emerald-600">{formatCurrency(closing.totalAmount || 0)}</td>
                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{closing.receiptsCount || 0}</td>
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
