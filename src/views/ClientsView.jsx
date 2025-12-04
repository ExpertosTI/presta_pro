import React, { useMemo } from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency } from '../utils/formatters';

const getStatusLabel = (status) => {
  const map = {
    ACTIVE: 'Activo',
    PAID: 'Pagado',
    LATE: 'Atrasado',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    REVIEW: 'En revisión',
  };
  return map[status] || status;
};

export function ClientsView({ clients, loans, onNewClient, selectedClientId, onSelectClient, onSelectLoan }) {
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const clientLoans = useMemo(
    () => (selectedClient ? loans.filter(l => l.clientId === selectedClient.id) : []),
    [loans, selectedClient],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <button onClick={onNewClient} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          Nuevo Cliente
        </button>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Listado de Clientes</h3>
          <span className="text-sm text-slate-500">Total: {clients.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Teléfono</th>
                <th className="p-2 text-left">Dirección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map(c => (
                <tr
                  key={c.id}
                  onClick={() => onSelectClient && onSelectClient(c.id)}
                  className={`cursor-pointer hover:bg-blue-50 ${selectedClientId === c.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-2 font-medium text-slate-800">{c.name}</td>
                  <td className="p-2 text-slate-600">{c.phone}</td>
                  <td className="p-2 text-slate-600">{c.address}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400" colSpan={3}>No hay clientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedClient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold text-lg mb-3">Detalle del Cliente</h3>
            <p className="text-sm text-slate-700"><span className="font-semibold">Nombre: </span>{selectedClient.name}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Teléfono: </span>{selectedClient.phone || 'N/D'}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Dirección: </span>{selectedClient.address || 'N/D'}</p>
            {selectedClient.idNumber && (
              <p className="text-sm text-slate-700"><span className="font-semibold">ID: </span>{selectedClient.idNumber}</p>
            )}
            {selectedClient.notes && (
              <p className="text-sm text-slate-700 mt-2"><span className="font-semibold">Notas: </span>{selectedClient.notes}</p>
            )}
          </Card>

          <Card>
            <h3 className="font-bold text-lg mb-3">Préstamos del Cliente</h3>
            {clientLoans.length === 0 && (
              <p className="text-sm text-slate-400">Este cliente no tiene préstamos registrados.</p>
            )}
            {clientLoans.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {clientLoans.map(l => (
                  <li
                    key={l.id}
                    className="py-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors"
                    onClick={() => onSelectLoan && onSelectLoan(l.id)}
                  >
                    <span>{formatCurrency(l.amount)} • {l.rate}%</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{getStatusLabel(l.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default ClientsView;
