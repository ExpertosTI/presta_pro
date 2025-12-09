import React from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import { exportToPDF, exportToExcel } from '../utils/reportExport';
import { FileText, FileSpreadsheet, Printer } from 'lucide-react';

export function AccountingView({ loans = [], expenses = [], receipts = [], systemSettings = {} }) {
  const totalCapital = (loans || []).reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalInteresProyectado = (loans || []).reduce((acc, l) => acc + (l.totalInterest || 0), 0);
  const totalCobrado = (receipts || []).reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
  const totalGastos = (expenses || []).reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const utilidadNeta = totalCobrado - totalGastos;

  const lastReceipts = (receipts || []).slice(0, 8);
  const lastExpenses = (expenses || []).slice(-8).reverse();

  const handleExportPDF = () => {
    exportToPDF({
      receipts,
      expenses,
      loans,
      companyName: systemSettings.companyName || 'Presta Pro',
      companyLogo: systemSettings.companyLogo,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      receipts,
      expenses,
      loans,
      companyName: systemSettings.companyName || 'Presta Pro',
    }, 'contabilidad');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Contabilidad</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs md:text-sm font-semibold hover:bg-red-700 shadow-md"
          >
            <FileText size={16} /> Exportar PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs md:text-sm font-semibold hover:bg-emerald-700 shadow-md"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs md:text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Capital Prestado</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalCapital)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Suma de todos los préstamos otorgados.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Interés Proyectado</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalInteresProyectado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total de intereses según las tablas de amortización.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Cobrado Acumulado</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCobrado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Suma de todos los recibos registrados.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Utilidad Neta (Cobros - Gastos)</p>
          <p className={`text-2xl font-bold ${utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(utilidadNeta)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Indicador rápido, no reemplaza estados financieros formales.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Últimos Cobros</h3>
          {lastReceipts.length === 0 ? (
            <p className="text-sm text-slate-400">No hay recibos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {lastReceipts.map(r => (
                <li key={r.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{r.clientName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recibo #{r.id.substr(0, 6).toUpperCase()} • Préstamo {r.loanId.substr(0, 6).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(r.amount)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(r.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Últimos Gastos</h3>
          {lastExpenses.length === 0 ? (
            <p className="text-sm text-slate-400">No hay gastos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {lastExpenses.map(e => (
                <li key={e.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{e.category || 'Gasto'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{e.notes || e.description || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(e.amount)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{e.date ? formatDate(e.date) : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AccountingView;
