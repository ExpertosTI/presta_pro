import React, { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import { MapPin, CheckCircle, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export function RoutesView({
  loans,
  clients,
  registerPayment,
  collectors,
  currentRouteLoanIds,
  routeActive,
  toggleLoanInRoute,
  clearCurrentRoute,
  startRoute,
  finishRoute,
  showToast,
  addRouteClosing,
  routeClosings,
  receipts,
  includeFutureInstallments,
}) {
  const [collectorFilter, setCollectorFilter] = useState('');

  const { pendingCollections, sortedRoute, totalToCollect, selectedStops, collectorTodayTotal, collectorTodayCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = loans.flatMap(loan => {
      const client = clients.find(c => c.id === loan.clientId);
      if (!client) return [];

      if (collectorFilter && client.collectorId !== collectorFilter) return [];
      const pendingInstallment = loan.schedule.find(s => s.status !== 'PAID');
      if (!pendingInstallment) return [];

      // Si includeFutureInstallments es falso, solo incluir cuotas vencidas o de hoy
      if (!includeFutureInstallments) {
        const dueDate = new Date(pendingInstallment.date);
        if (dueDate > today) return [];
      }

      return [{
        ...pendingInstallment,
        loanId: loan.id,
        clientName: client?.name,
        clientAddress: client?.address,
        clientPhone: client?.phone,
        totalDue: pendingInstallment.payment,
      }];
    });

    const sorted = pending.sort((a, b) => a.clientAddress?.localeCompare(b.clientAddress || '') || 0);
    const total = sorted.reduce((acc, i) => acc + i.payment, 0);
    const selected = sorted.filter(stop =>
      currentRouteLoanIds.includes(`${stop.loanId}:${stop.id}`)
    );

    // Calcular total cobrado hoy para el cobrador filtrado
    let collectorTodayTotal = 0;
    let collectorTodayCount = 0;
    if (collectorFilter && Array.isArray(receipts)) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      receipts.forEach((r) => {
        const client = clients.find(c => c.id === r.clientId);
        if (!client || client.collectorId !== collectorFilter) return;
        const d = new Date(r.date);
        if (d >= startOfToday && d < endOfToday) {
          const amount = parseFloat(r.amount || 0) || 0;
          collectorTodayTotal += amount;
          collectorTodayCount += 1;
        }
      });
    }

    return { pendingCollections: pending, sortedRoute: sorted, totalToCollect: total, selectedStops: selected, collectorTodayTotal, collectorTodayCount };
  }, [loans, clients, collectorFilter, currentRouteLoanIds, receipts]);

  const lastClosingForSelectedCollector = useMemo(() => {
    if (!collectorFilter || !Array.isArray(routeClosings)) return null;
    return routeClosings.find(c => c.collectorId === collectorFilter) || null;
  }, [collectorFilter, routeClosings]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin /> Ruta Inteligente
          </h2>
          <p className="opacity-80">Optimización de cobros por zona</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{pendingCollections.length}</p>
          <p className="text-xs uppercase tracking-wider">Paradas Pendientes</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filtrar por Cobrador:</span>
          <select
            className="p-2 border rounded-lg bg-white text-sm"
            value={collectorFilter}
            onChange={(e) => setCollectorFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startRoute}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-emerald-700"
          >
            <MapPin size={16} /> {routeActive ? 'Ruta en curso' : 'Iniciar Ruta'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!collectorFilter) {
                showToast && showToast('Selecciona un cobrador para cuadrar la ruta.', 'error');
                return;
              }

              const confirmed = window.confirm('¿Confirmas que el cobrador entregó todo el dinero cobrado en caja?');
              if (!confirmed) {
                showToast && showToast('Cierre de ruta cancelado. Verifica la entrega del dinero.', 'info');
                return;
              }

              const total = collectorTodayTotal || 0;
              const count = collectorTodayCount || 0;
              const todayIso = new Date().toISOString();
              addRouteClosing && addRouteClosing({
                collectorId: collectorFilter,
                date: todayIso,
                totalAmount: total,
                receiptsCount: count,
              });
              finishRoute && finishRoute();
              showToast && showToast('Ruta cerrada y cuadre del cobrador registrado correctamente.', 'success');
            }}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-blue-700"
          >
            Cerrar / Cuadre Cobrador
          </button>
          <button
            type="button"
            onClick={clearCurrentRoute}
            className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-300"
          >
            Limpiar Ruta
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-slate-800"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sortedRoute.map((stop, index) => {
            const key = `${stop.loanId}:${stop.id}`;
            const selected = currentRouteLoanIds.includes(key);
            return (
              <div
                key={stop.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{stop.clientName}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin size={14} /> {stop.clientAddress}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Cuota #{stop.number} • Vence: {formatDate(stop.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => toggleLoanInRoute(stop.loanId, stop.id)}
                    className={`mb-1 inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold border ${
                      selected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-slate-50 border-slate-300 text-slate-500'
                    }`}
                  >
                    {selected ? 'En ruta' : 'Agregar a ruta'}
                  </button>
                  <p className="font-bold text-lg text-slate-800">{formatCurrency(stop.payment)}</p>
                  <button
                    onClick={() => registerPayment(stop.loanId, stop.id)}
                    className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-green-600 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Cobrar
                  </button>
                </div>
              </div>
            );
          })}
          {sortedRoute.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">¡Ruta Completada!</h3>
              <p className="text-slate-500">No hay cobros pendientes para hoy.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-slate-50 border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Resumen de Ruta</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total a Recaudar</span>
                <span className="font-bold text-slate-800">{formatCurrency(totalToCollect)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Clientes Visitados</span>
                <span className="font-bold text-slate-800">0 / {sortedRoute.length}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Ruta en construcción</h3>
            {selectedStops.length === 0 ? (
              <p className="text-xs text-slate-400">Selecciona clientes en la lista para armar la ruta.</p>
            ) : (
              <div className="space-y-2 text-xs">
                <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {selectedStops.map((stop) => (
                    <li key={stop.id} className="py-1 flex justify-between">
                      <span className="truncate mr-2">{stop.clientName}</span>
                      <span className="font-semibold">{formatCurrency(stop.payment)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <span className="font-semibold">Total Ruta</span>
                  <span className="font-bold">{formatCurrency(selectedStops.reduce((acc, s) => acc + s.payment, 0))}</span>
                </div>
              </div>
            )}
          </Card>

          {lastClosingForSelectedCollector && (
            <Card className="bg-emerald-50 border-emerald-200">
              <h3 className="font-bold text-emerald-800 mb-2 text-sm">Último cuadre del cobrador</h3>
              <p className="text-xs text-emerald-700 mb-1">
                Fecha: {formatDate(lastClosingForSelectedCollector.date)}
              </p>
              <p className="text-xs text-emerald-700 mb-1">
                Recibos: <span className="font-bold">{lastClosingForSelectedCollector.receiptsCount}</span>
              </p>
              <p className="text-xs text-emerald-700">
                Total cobrado: <span className="font-bold">{formatCurrency(lastClosingForSelectedCollector.totalAmount)}</span>
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoutesView;
