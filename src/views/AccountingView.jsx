import React from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';

export function AccountingView({ loans = [], expenses = [], receipts = [] }) {
  const totalCapital = (loans || []).reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalInteresProyectado = (loans || []).reduce((acc, l) => acc + (l.totalInterest || 0), 0);
  const totalCobrado = (receipts || []).reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
  const totalGastos = (expenses || []).reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const utilidadNeta = totalCobrado - totalGastos;

  const lastReceipts = (receipts || []).slice(0, 8);
  const lastExpenses = (expenses || []).slice(-8).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Contabilidad</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs md:text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          Imprimir reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Capital Prestado</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalCapital)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Suma de todos los préstamos otorgados.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Interés Proyectado</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalInteresProyectado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total de intereses según las tablas de amortización.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Cobrado Acumulado</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCobrado)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Suma de todos los recibos registrados.</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Utilidad Neta (Cobros - Gastos)</p>
          <p className={`text-2xl font-bold ${utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(utilidadNeta)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Indicador rápido, no reemplaza estados financieros formales.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-3">Últimos Cobros</h3>
          {lastReceipts.length === 0 ? (
            <p className="text-sm text-slate-400">No hay recibos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {lastReceipts.map(r => (
                <li key={r.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{r.clientName}</p>
                    <p className="text-[11px] text-slate-500">
                      Recibo #{r.id.substr(0, 6).toUpperCase()} • Préstamo {r.loanId.substr(0, 6).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(r.amount)}</p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(r.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-lg mb-3">Últimos Gastos</h3>
          {lastExpenses.length === 0 ? (
            <p className="text-sm text-slate-400">No hay gastos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {lastExpenses.map(e => (
                <li key={e.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{e.category || 'Gasto'}</p>
                    <p className="text-[11px] text-slate-500">{e.notes || e.description || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(e.amount)}</p>
                    <p className="text-[11px] text-slate-500">{e.date ? formatDate(e.date) : ''}</p>
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
