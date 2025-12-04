import React, { useMemo } from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters';

export function LoansView({ loans, clients, registerPayment, selectedLoanId, onSelectLoan }) {
  const selectedLoan = useMemo(
    () => loans.find(l => l.id === selectedLoanId) || null,
    [loans, selectedLoanId],
  );

  const selectedClient = selectedLoan
    ? clients.find(c => c.id === selectedLoan.clientId) || null
    : null;

  const firstPendingInstallment = selectedLoan
    ? selectedLoan.schedule.find(i => i.status !== 'PAID') || null
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Préstamos y Cobros</h2>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left">Tasa</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map(l => {
                const client = clients.find(c => c.id === l.clientId);
                const isSelected = selectedLoanId === l.id;
                return (
                  <tr
                    key={l.id}
                    onClick={() => onSelectLoan && onSelectLoan(l.id)}
                    className={`cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-2">{client?.name || 'Sin cliente'}</td>
                    <td className="p-2">{formatCurrency(l.amount)}</td>
                    <td className="p-2">{l.rate}%</td>
                    <td className="p-2"><Badge status={l.status} /></td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400" colSpan={4}>
                    No hay préstamos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedLoan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <h3 className="font-bold text-lg mb-3">Detalle del Préstamo</h3>
            {selectedClient && (
              <p className="text-sm text-slate-700 mb-1">
                <span className="font-semibold">Cliente: </span>{selectedClient.name}
              </p>
            )}
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">Monto: </span>{formatCurrency(selectedLoan.amount)}
            </p>
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">Tasa: </span>{selectedLoan.rate}%
            </p>
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">Estado: </span>
              <Badge status={selectedLoan.status} />
            </p>
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">Total Pagado: </span>{formatCurrency(selectedLoan.totalPaid || 0)}
            </p>

            {firstPendingInstallment && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                <p className="font-semibold text-blue-800 mb-1">Próxima cuota pendiente</p>
                <p className="text-slate-700 mb-1">
                  <span className="font-semibold">Cuota #{firstPendingInstallment.number}</span> • {formatDate(firstPendingInstallment.date)}
                </p>
                <p className="text-slate-700 mb-2">
                  <span className="font-semibold">Monto: </span>{formatCurrency(firstPendingInstallment.payment)}
                </p>
                <button
                  onClick={() => registerPayment(selectedLoan.id, firstPendingInstallment.id)}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700"
                >
                  Registrar Pago de esta Cuota
                </button>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="font-bold text-lg mb-3">Tabla de Cuotas</h3>
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-right">Cuota</th>
                    <th className="p-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLoan.schedule.map(inst => (
                    <tr key={inst.id}>
                      <td className="p-2">{inst.number}</td>
                      <td className="p-2">{formatDate(inst.date)}</td>
                      <td className="p-2 text-right">{formatCurrency(inst.payment)}</td>
                      <td className="p-2 text-right">
                        <Badge status={inst.status === 'PAID' ? 'PAID' : 'PENDING'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LoansView;
