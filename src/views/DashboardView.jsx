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
  const totalLent = loans.reduce((acc, l) => acc + (parseFloat(l.amount || 0) || 0), 0);
  const totalCollected = loans.reduce((acc, l) => acc + (l.totalPaid || 0), 0);

  const portfolioOutstanding = totalLent - totalCollected;
  const collectionRate = totalLent > 0 ? (totalCollected / totalLent) * 100 : 0;

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const lateLoans = loans.filter((l) => l.status === 'LATE');
  const paidLoans = loans.filter((l) => l.status === 'PAID');

  const last5Loans = loans.slice(-5);
  const last5Clients = clients.slice(-5);

  const chartData = loans.map((l) => {
    const client = clients.find((c) => c.id === l.clientId);
    const name = (client?.name || 'Cliente').split(' ')[0];
    const amount = parseFloat(l.amount || 0) || 0;
    const paid = l.totalPaid || 0;
    return { name, 'Monto Prestado': amount, 'Total Pagado': paid };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <h3 className="font-bold text-slate-500">Total Prestado</h3>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalLent)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {loans.length} {loans.length === 1 ? 'préstamo' : 'préstamos'} registrados.
          </p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-500">Total Cobrado</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {collectionRate.toFixed(1)}% del capital prestado ya cobrado.
          </p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-500">Cartera pendiente</h3>
          <p className="text-3xl font-bold text-amber-600">
            {formatCurrency(portfolioOutstanding)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeLoans.length} activos · {lateLoans.length} atrasados.
          </p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-500">Clientes Activos</h3>
          <p className="text-3xl font-bold text-slate-800">{clients.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {paidLoans.length} préstamos ya pagados.
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-4">Actividad reciente de préstamos</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Monto Prestado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Pagado" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {chartData.length > 0 && (
              <div className="mt-6 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line
                      type="monotone"
                      dataKey="Monto Prestado"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Total Pagado"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="w-full lg:w-64 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Estado de la cartera</h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{getStatusLabel('ACTIVE')}</span>
                <span className="font-semibold text-slate-800">{activeLoans.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{getStatusLabel('LATE')}</span>
                <span className="font-semibold text-amber-700">{lateLoans.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{getStatusLabel('PAID')}</span>
                <span className="font-semibold text-emerald-700">{paidLoans.length}</span>
              </div>
              <div className="pt-2">
                <p className="text-[11px] text-slate-500 mb-1">
                  Porcentaje cobrado del capital prestado
                </p>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(collectionRate, 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {collectionRate.toFixed(1)}% cobrado · {formatCurrency(portfolioOutstanding)} pendientes.
                </p>
              </div>
            </div>
          </div>
        </div>
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
