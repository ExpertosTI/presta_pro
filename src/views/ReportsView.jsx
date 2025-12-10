import React from 'react';
import Card from '../shared/components/ui/Card';
import { formatCurrency } from '../shared/utils/formatters';

export function ReportsView({ loans, expenses }) {
  const totalCapital = loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalInteres = loans.reduce((acc, l) => acc + (l.totalInterest || 0), 0);
  const totalGastos = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reportes</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Capital Prestado</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalCapital)}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Intereses Proyectados</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalInteres)}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Gastos</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalGastos)}</p>
        </Card>
      </div>
    </div>
  );
}

export default ReportsView;
