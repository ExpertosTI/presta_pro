import React, { useState } from 'react';
import Card from '../components/Card.jsx';
import { formatCurrency } from '../utils/formatters';

export function RequestsView({ requests, clients, addRequest, approveRequest, rejectRequest, onNewClient }) {
  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    rate: '',
    term: '',
    frequency: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Solicitudes de Crédito</h2>
        <button
          onClick={() => document.getElementById('reqForm').scrollIntoView()}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          Nueva Solicitud
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-600 uppercase text-sm tracking-wider">En Revisión</h3>
          {requests.filter(r => r.status === 'REVIEW').map(req => {
            const client = clients.find(c => c.id === req.clientId);
            return (
              <Card key={req.id}>
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-slate-800">{client?.name}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Revisión</span>
                </div>
                <div className="text-sm text-slate-600 grid grid-cols-2 gap-2 mb-3">
                  <div>
                    Monto: <span className="font-semibold">{formatCurrency(req.amount)}</span>
                  </div>
                  <div>Tasa: {req.rate}%</div>
                  <div>
                    Plazo: {req.term} {req.frequency}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveRequest(req)}
                    className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-teal-700"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => rejectRequest(req)}
                    className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200"
                  >
                    Rechazar
                  </button>
                </div>
              </Card>
            );
          })}
          {requests.filter(r => r.status === 'REVIEW').length === 0 && (
            <p className="text-center text-slate-400 py-4 text-sm">No hay solicitudes pendientes</p>
          )}
        </div>

        <div id="reqForm">
          <Card>
            <h3 className="font-bold text-lg mb-4">Crear Nueva Solicitud</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded-lg bg-white"
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onNewClient}
                  className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200"
                >
                  +
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Monto"
                  className="p-2 border rounded-lg"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Tasa %"
                  className="p-2 border rounded-lg"
                  value={form.rate}
                  onChange={e => setForm({ ...form, rate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Plazo"
                  className="p-2 border rounded-lg"
                  value={form.term}
                  onChange={e => setForm({ ...form, term: e.target.value })}
                />
                <select
                  className="p-2 border rounded-lg"
                  value={form.frequency}
                  onChange={e => setForm({ ...form, frequency: e.target.value })}
                >
                  <option>Diario</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (form.clientId) addRequest(form);
                }}
                className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold"
              >
                Guardar Solicitud
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RequestsView;
