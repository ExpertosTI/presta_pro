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

export function ClientsView({ clients, loans, onNewClient, selectedClientId, onSelectClient, onSelectLoan, onEditClient }) {
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const clientLoans = useMemo(
    () => (selectedClient ? loans.filter(l => l.clientId === selectedClient.id) : []),
    [loans, selectedClient],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Clientes</h2>
        <button onClick={onNewClient} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          Nuevo Cliente
        </button>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Listado de Clientes</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">Total: {clients.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-2 text-left w-16"></th>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Teléfono</th>
                <th className="p-2 text-left">Dirección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {clients.map(c => (
                <tr
                  key={c.id}
                  onClick={() => onSelectClient && onSelectClient(c.id)}
                  className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${selectedClientId === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="p-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-bold">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                  <td className="p-2 text-slate-600 dark:text-slate-400">{c.phone}</td>
                  <td className="p-2 text-slate-600 dark:text-slate-400">{c.address}</td>
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
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-2 border-indigo-100 dark:border-slate-600 shadow-sm flex-shrink-0">
                {selectedClient.photoUrl ? (
                  <img src={selectedClient.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-slate-400 font-bold">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">{selectedClient.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">CLIENTE #{selectedClient.id.slice(0, 6)}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Teléfono: </span>{selectedClient.phone || 'N/D'}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Dirección: </span>{selectedClient.address || 'N/D'}</p>
            {selectedClient.idNumber && (
              <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">ID: </span>{selectedClient.idNumber}</p>
            )}
            {selectedClient.notes && (
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2"><span className="font-semibold">Notas: </span>{selectedClient.notes}</p>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onEditClient && onEditClient(selectedClient)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
              >
                Editar cliente
              </button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Préstamos del Cliente</h3>
            {clientLoans.length === 0 && (
              <p className="text-sm text-slate-400">Este cliente no tiene préstamos registrados.</p>
            )}
            {clientLoans.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {clientLoans.map(l => (
                  <li
                    key={l.id}
                    className="py-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 transition-colors text-slate-700 dark:text-slate-200"
                    onClick={() => onSelectLoan && onSelectLoan(l.id)}
                  >
                    <span>{formatCurrency(l.amount)} • {l.rate}%</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{getStatusLabel(l.status)}</span>
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
