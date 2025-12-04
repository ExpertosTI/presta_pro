import React from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency } from '../utils/formatters';

function CuadreView({ receipts = [], expenses = [] }) {
  const totalIngresos = receipts.reduce((acc, r) => acc + (parseFloat(r.amount || 0) || 0), 0);
  const totalGastos = expenses.reduce((acc, g) => acc + (parseFloat(g.amount || 0) || 0), 0);
  const balance = totalIngresos - totalGastos;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Cuadre de Caja</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800">
            <p className="text-xs font-semibold uppercase tracking-wide">Ingresos</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalIngresos)}</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 text-rose-800">
            <p className="text-xs font-semibold uppercase tracking-wide">Gastos</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalGastos)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide">Balance</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CuadreView;
