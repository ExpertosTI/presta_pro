import React, { useState } from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export function ExpensesView({ expenses, addExpense }) {
  const [form, setForm] = useState({ concept: '', amount: '' });

  const handleAdd = () => {
    if (!form.amount || !form.concept) return;
    addExpense({ description: form.concept, amount: parseFloat(form.amount) || 0 });
    setForm({ concept: '', amount: '' });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Gastos</h2>

      <Card>
        <h3 className="font-bold text-lg mb-4">Registrar Gasto</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="p-2 border rounded-lg"
            placeholder="Concepto"
            value={form.concept}
            onChange={e => setForm({ ...form, concept: e.target.value })}
          />
          <input
            type="number"
            className="p-2 border rounded-lg"
            placeholder="Monto"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
          <button
            onClick={handleAdd}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold"
          >
            Guardar Gasto
          </button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Concepto</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(e => (
                <tr key={e.id}>
                  <td className="p-2">{e.description || e.concept || 'Gasto'}</td>
                  <td className="p-2">{formatCurrency(e.amount)}</td>
                  <td className="p-2">{formatDateTime(e.date)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400" colSpan={3}>No hay gastos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default ExpensesView;
