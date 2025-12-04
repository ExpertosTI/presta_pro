import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card.jsx';
import { formatCurrency, formatDate } from '../utils/formatters';

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

const DashboardView = ({ loans, clients, onSelectLoan, onSelectClient }) => {
  const totalLent = loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
  const totalCollected = loans.reduce((acc, l) => acc + (l.totalPaid || 0), 0);

  const last5Loans = loans.slice(-5);
  const last5Clients = clients.slice(-5);

  const chartData = loans.map(l => {
    const client = clients.find(c => c.id === l.clientId);
    const name = (client?.name || 'Cliente').split(' ')[0];
    return { name, 'Monto Prestado': parseFloat(l.amount || 0), 'Total Pagado': l.totalPaid || 0 };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-bold text-slate-500">Total Prestado</h3>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalLent)}</p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-500">Total Cobrado</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalCollected)}</p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-500">Clientes Activos</h3>
          <p className="text-3xl font-bold text-slate-800">{clients.length}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-lg mb-4">Actividad Reciente de Préstamos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Monto Prestado" fill="#3b82f6" />
            <Bar dataKey="Total Pagado" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-4">Últimos Préstamos</h3>
          <ul className="divide-y divide-slate-100">
            {last5Loans.map(loan => (
              <li
                key={loan.id}
                className="py-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors"
                onClick={() => onSelectLoan && onSelectLoan(loan.id)}
              >
                <div>
                  <p className="font-bold">{loan.clientName}</p>
                  <p className="text-sm text-slate-500">{formatCurrency(loan.amount)}</p>
                </div>
                <p className="text-sm font-bold">{getStatusLabel(loan.status)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4">Nuevos Clientes</h3>
          <ul className="divide-y divide-slate-100">
            {last5Clients.map(client => (
              <li
                key={client.id}
                className="py-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors"
                onClick={() => onSelectClient && onSelectClient(client.id)}
              >
                <div>
                  <p className="font-bold">{client.name}</p>
                  <p className="text-sm text-slate-500">{client.phone}</p>
                </div>
                <p className="text-sm font-bold">{client.createdAt ? formatDate(client.createdAt) : ''}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
