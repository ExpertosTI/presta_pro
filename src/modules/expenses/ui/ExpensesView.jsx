import React, { useState, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate, formatDateTime } from '../../../shared/utils/formatters';
import {
  Wallet, Search, Calendar, Trash2, Download, Upload, RefreshCw,
  TrendingUp, PlusCircle, X, Filter, BarChart3
} from 'lucide-react';

// MEJORA 1: Expense categories
const CATEGORIES = [
  { value: 'OPERATIVO', label: 'Operativo', color: 'blue' },
  { value: 'NOMINA', label: 'Nómina', color: 'violet' },
  { value: 'SERVICIOS', label: 'Servicios', color: 'amber' },
  { value: 'MARKETING', label: 'Marketing', color: 'pink' },
  { value: 'TRANSPORTE', label: 'Transporte', color: 'cyan' },
  { value: 'SUMINISTROS', label: 'Suministros', color: 'emerald' },
  { value: 'OTRO', label: 'Otro', color: 'slate' }
];

const getCategoryStyle = (cat) => {
  const found = CATEGORIES.find(c => c.value === cat);
  const color = found?.color || 'slate';
  return `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`;
};

export function ExpensesView({ expenses, addExpense, onDeleteExpense }) {
  // Form state
  const [form, setForm] = useState({
    concept: '',
    amount: '',
    // MEJORA 1: Category
    category: 'OPERATIVO',
    // MEJORA 2: Custom date
    date: new Date().toISOString().split('T')[0],
    // MEJORA 10: Receipt attachment
    receiptUrl: '',
    // MEJORA 11: Recurring flag
    isRecurring: false,
    recurringFrequency: 'MONTHLY'
  });

  // MEJORA 3: Search
  const [searchQuery, setSearchQuery] = useState('');

  // MEJORA 5: Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // MEJORA 1: Category filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // MEJORA 7: Delete confirmation
  const [deleteModal, setDeleteModal] = useState(null);

  // MEJORA 10: File upload
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.description || e.concept || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(e => e.category === categoryFilter);
    }

    // Date filter
    if (dateFrom) {
      result = result.filter(e => new Date(e.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter(e => new Date(e.date) <= new Date(dateTo));
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date) - new Date(a.date));

    return result;
  }, [expenses, searchQuery, categoryFilter, dateFrom, dateTo]);

  // MEJORA 13: Monthly statistics
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = expenses.filter(e => {
      const d = new Date(e.date);
      const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear();
    });

    const thisMonthTotal = thisMonth.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const lastMonthTotal = lastMonth.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const filteredTotal = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // Category breakdown
    const byCategory = {};
    thisMonth.forEach(e => {
      const cat = e.category || 'OTRO';
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
    });

    return { thisMonthTotal, lastMonthTotal, filteredTotal, byCategory, thisMonthCount: thisMonth.length };
  }, [expenses, filteredExpenses]);

  const handleAdd = () => {
    if (!form.amount || !form.concept) return;
    addExpense({
      description: form.concept,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      receiptUrl: form.receiptUrl,
      isRecurring: form.isRecurring,
      recurringFrequency: form.isRecurring ? form.recurringFrequency : null
    });
    setForm({
      concept: '',
      amount: '',
      category: 'OPERATIVO',
      date: new Date().toISOString().split('T')[0],
      receiptUrl: '',
      isRecurring: false,
      recurringFrequency: 'MONTHLY'
    });
  };

  // MEJORA 7: Delete expense
  const handleDelete = (expense) => {
    setDeleteModal(expense);
  };

  const confirmDelete = () => {
    if (deleteModal && onDeleteExpense) {
      onDeleteExpense(deleteModal.id);
    }
    setDeleteModal(null);
  };

  // MEJORA 9: Export to CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Recurrente'];
    const rows = filteredExpenses.map(e => [
      formatDate(e.date),
      (e.description || e.concept || '').replace(/,/g, ';'),
      CATEGORIES.find(c => c.value === e.category)?.label || 'Otro',
      e.amount,
      e.isRecurring ? 'Sí' : 'No'
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // MEJORA 10: Handle receipt upload (simulated - base64)
  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm({ ...form, receiptUrl: event.target?.result });
      setUploadingReceipt(false);
    };
    reader.onerror = () => {
      setUploadingReceipt(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600" />
          Gastos
        </h2>
        {/* MEJORA 9: Export button */}
        <button
          onClick={exportToCSV}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-500 transition-colors text-sm font-semibold"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* MEJORA 13: Monthly Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp size={12} /> Este Mes
          </p>
          <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(monthlyStats.thisMonthTotal)}</p>
          <p className="text-xs text-emerald-600">{monthlyStats.thisMonthCount} gastos</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Mes Anterior</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(monthlyStats.lastMonthTotal)}</p>
          <p className="text-xs text-slate-500">
            {monthlyStats.thisMonthTotal > monthlyStats.lastMonthTotal ? '↑' : '↓'}
            {Math.abs(((monthlyStats.thisMonthTotal - monthlyStats.lastMonthTotal) / (monthlyStats.lastMonthTotal || 1)) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <Filter size={12} /> Filtrado
          </p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{formatCurrency(monthlyStats.filteredTotal)}</p>
          <p className="text-xs text-blue-600">{filteredExpenses.length} resultados</p>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
          <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
            <BarChart3 size={12} /> Top Categoría
          </p>
          {Object.keys(monthlyStats.byCategory).length > 0 ? (
            <>
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">
                {CATEGORIES.find(c => c.value === Object.keys(monthlyStats.byCategory).sort((a, b) => monthlyStats.byCategory[b] - monthlyStats.byCategory[a])[0])?.label}
              </p>
              <p className="text-xs text-violet-600">
                {formatCurrency(Math.max(...Object.values(monthlyStats.byCategory)))}
              </p>
            </>
          ) : (
            <p className="text-sm text-violet-600">Sin datos</p>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          {/* MEJORA 3: Search */}
          <div className="flex-1 min-w-[180px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
            />
          </div>
          {/* MEJORA 1: Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
          >
            <option value="ALL">Todas categorías</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {/* MEJORA 5: Date filter */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
            />
            <span className="text-xs text-slate-400">a</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
            />
          </div>
          {(searchQuery || categoryFilter !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setDateFrom(''); setDateTo(''); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </Card>

      {/* Add Expense Form */}
      <Card>
        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <PlusCircle size={18} className="text-emerald-600" />
          Registrar Gasto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
            placeholder="Concepto"
            value={form.concept}
            onChange={e => setForm({ ...form, concept: e.target.value })}
          />
          <div className="flex flex-col gap-1">
            <input
              type="number"
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
              placeholder="Monto"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
            {form.amount && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {formatCurrency(form.amount)}
              </span>
            )}
          </div>
          {/* MEJORA 1: Category selector */}
          <select
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {/* MEJORA 2: Date picker */}
          <input
            type="date"
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {/* MEJORA 10 & 11: Receipt and Recurring */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {/* MEJORA 10: Receipt upload */}
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Upload size={16} className="text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {uploadingReceipt ? 'Subiendo...' : form.receiptUrl ? '✓ Comprobante adjunto' : 'Adjuntar factura/recibo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />
            </label>
            {form.receiptUrl && (
              <button
                onClick={() => setForm({ ...form, receiptUrl: '' })}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {/* MEJORA 11: Recurring checkbox */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <RefreshCw size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Gasto recurrente</span>
            </label>
            {form.isRecurring && (
              <select
                value={form.recurringFrequency}
                onChange={(e) => setForm({ ...form, recurringFrequency: e.target.value })}
                className="p-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300"
              >
                <option value="WEEKLY">Semanal</option>
                <option value="MONTHLY">Mensual</option>
                <option value="YEARLY">Anual</option>
              </select>
            )}
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
        >
          Guardar Gasto
        </button>
      </Card>

      {/* Expenses Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-2 text-left">Concepto</th>
                <th className="p-2 text-left">Categoría</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left hidden md:table-cell">Recurrente</th>
                <th className="p-2 text-left hidden lg:table-cell">Comprobante</th>
                <th className="p-2 text-center w-16">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredExpenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-2 text-slate-800 dark:text-slate-200">{e.description || e.concept || 'Gasto'}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(e.category)}`}>
                      {CATEGORIES.find(c => c.value === e.category)?.label || 'Otro'}
                    </span>
                  </td>
                  <td className="p-2 text-slate-600 dark:text-slate-400 font-mono">{formatCurrency(e.amount)}</td>
                  <td className="p-2 text-slate-600 dark:text-slate-400">{formatDate(e.date)}</td>
                  <td className="p-2 text-slate-500 dark:text-slate-500 hidden md:table-cell">
                    {e.isRecurring && (
                      <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                        <RefreshCw size={12} />
                        {e.recurringFrequency === 'WEEKLY' ? 'Semanal' : e.recurringFrequency === 'YEARLY' ? 'Anual' : 'Mensual'}
                      </span>
                    )}
                  </td>
                  <td className="p-2 hidden lg:table-cell">
                    {e.receiptUrl && (
                      <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                        Ver
                      </a>
                    )}
                  </td>
                  {/* MEJORA 7: Delete button */}
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDelete(e)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400 dark:text-slate-500" colSpan={7}>
                    {searchQuery || categoryFilter !== 'ALL' || dateFrom || dateTo
                      ? 'No se encontraron gastos con los filtros aplicados.'
                      : 'No hay gastos registrados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MEJORA 7: Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
              <Trash2 size={20} /> Eliminar Gasto
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              ¿Estás seguro de eliminar este gasto?
            </p>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 mb-4">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{deleteModal.description || deleteModal.concept}</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(deleteModal.amount)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-500"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesView;
