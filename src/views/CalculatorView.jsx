import React, { useState, useEffect } from 'react';
import Card from '../components/Card.jsx';
import { Calculator } from 'lucide-react';
import { calculateSchedule } from '../shared/utils/amortization';
import { formatCurrency, formatDate } from '../shared/utils/formatters';

export function CalculatorView() {
  const [simData, setSimData] = useState({
    amount: 10000,
    rate: 10,
    term: 12,
    frequency: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (simData.amount && simData.rate && simData.term) {
      setSchedule(
        calculateSchedule(
          simData.amount,
          simData.rate,
          simData.term,
          simData.frequency,
          simData.startDate,
        ),
      );
    }
  }, [simData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1">
        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Calculator size={20} /> Simulador
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Monto a Prestar</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                value={simData.amount}
                onChange={e => setSimData({ ...simData, amount: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                {formatCurrency(simData.amount || 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tasa Interés %</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.rate}
                  onChange={e => setSimData({ ...simData, rate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.frequency}
                  onChange={e => setSimData({ ...simData, frequency: e.target.value })}
                >
                  <option>Diario</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Plazo (Cuotas)</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                value={simData.term}
                onChange={e => setSimData({ ...simData, term: e.target.value })}
              />
            </div>
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-blue-800 dark:text-blue-300">Cuota Estimada:</span>
                <span className="font-bold text-blue-800 dark:text-blue-300">
                  {schedule.length > 0 ? formatCurrency(schedule[0].payment) : '$0.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-800 dark:text-blue-300">Total Interés:</span>
                <span className="font-bold text-blue-800 dark:text-blue-300">
                  {schedule.length > 0
                    ? formatCurrency(schedule.reduce((a, b) => a + b.interest, 0))
                    : '$0.00'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full overflow-hidden flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Tabla de Amortización Proyectada</h3>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2 text-right">Cuota</th>
                  <th className="p-2 text-right">Interés</th>
                  <th className="p-2 text-right">Capital</th>
                  <th className="p-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {schedule.map(item => (
                  <tr key={item.number}>
                    <td className="p-2 font-bold text-slate-500 dark:text-slate-400">{item.number}</td>
                    <td className="p-2 text-slate-800 dark:text-slate-200">{formatDate(item.date)}</td>
                    <td className="p-2 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.payment)}</td>
                    <td className="p-2 text-right text-red-500 dark:text-red-400">{formatCurrency(item.interest)}</td>
                    <td className="p-2 text-right text-green-600 dark:text-green-400">{formatCurrency(item.principal)}</td>
                    <td className="p-2 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CalculatorView;
