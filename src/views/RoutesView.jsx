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
  const [confirmClosing, setConfirmClosing] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
  const [confirmClearRoute, setConfirmClearRoute] = useState(false);
  const [showPenaltyInput, setShowPenaltyInput] = useState(false);
  const [showClosingDetail, setShowClosingDetail] = useState(false);

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
        clientPhotoUrl: client?.photoUrl,
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

  const receiptsForLastClosing = useMemo(() => {
    if (!lastClosingForSelectedCollector || !Array.isArray(receipts)) return [];

    const startOfDay = new Date(lastClosingForSelectedCollector.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return receipts.filter((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      if (!client || client.collectorId !== lastClosingForSelectedCollector.collectorId) return false;
      const d = new Date(r.date);
      return d >= startOfDay && d < endOfDay;
    });
  }, [lastClosingForSelectedCollector, receipts, clients]);

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

              // Primer clic: pedir confirmación dentro de la app
              if (!confirmClosing) {
                setConfirmClosing(true);
                showToast && showToast('Verifica que el cobrador haya entregado todo el dinero y vuelve a presionar para confirmar el cuadre.', 'info');
                return;
              }

              // Segundo clic: registrar cuadre
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
              setConfirmClosing(false);
              showToast && showToast('Ruta cerrada y cuadre del cobrador registrado correctamente.', 'success');
            }}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-blue-700"
          >
            {confirmClosing ? 'Confirmar Cuadre' : 'Cerrar / Cuadre Cobrador'}
          </button>
          <button
            type="button"
            onClick={() => {
              // Si no hay cobrador filtrado o no hay cobros hoy, limpiar directo
              const hasCollector = !!collectorFilter;
              const hasReceiptsToday = (() => {
                if (!hasCollector || !Array.isArray(receipts)) return false;
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date(startOfToday);
                endOfToday.setDate(endOfToday.getDate() + 1);
                return receipts.some((r) => {
                  const client = clients.find((c) => c.id === r.clientId);
                  if (!client || client.collectorId !== collectorFilter) return false;
                  const d = new Date(r.date);
                  return d >= startOfToday && d < endOfToday;
                });
              })();

              if (hasReceiptsToday && !confirmClearRoute) {
                setConfirmClearRoute(true);
                showToast && showToast('Ya hay cobros registrados hoy para este cobrador. Si solo quieres limpiar la lista de ruta (sin borrar cobros), vuelve a presionar Limpiar Ruta.', 'info');
                return;
              }

              clearCurrentRoute();
              setConfirmClearRoute(false);
              showToast && showToast('Ruta limpiada. Los cobros y recibos permanecen registrados.', 'success');
            }}
            className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-300"
          >
            {confirmClearRoute ? 'Confirmar limpiar' : 'Limpiar Ruta'}
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
                className="glass p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-sm dark:shadow-indigo-500/30">
                    {index + 1}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {stop.clientPhotoUrl ? (
                      <img src={stop.clientPhotoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-bold">
                        {stop.clientName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{stop.clientName}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin size={14} /> {stop.clientAddress}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Cuota #{stop.number} • Vence: {formatDate(stop.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => toggleLoanInRoute(stop.loanId, stop.id)}
                    className={`mb-1 inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold border transition-all ${selected
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {selected ? 'En ruta' : 'Agregar a ruta'}
                  </button>
                  <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{formatCurrency(stop.payment)}</p>
                  <button
                    onClick={() => {
                      setPenaltyAmountInput('');
                      setPaymentToConfirm({
                        loanId: stop.loanId,
                        installmentId: stop.id,
                        amount: stop.payment,
                        number: stop.number,
                        date: stop.date,
                        clientName: stop.clientName,
                      });
                    }}
                    className="mt-2 w-full bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-500 flex items-center justify-center gap-2"
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
              <button
                type="button"
                onClick={() => setShowClosingDetail(true)}
                className="mt-3 text-[11px] font-semibold text-emerald-800 underline"
              >
                Ver tickets cobrados
              </button>
            </Card>
          )}
        </div>
      </div>

      {showClosingDetail && lastClosingForSelectedCollector && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Tickets cobrados en el último cuadre</h3>
            <p className="text-xs text-slate-600 mb-2">
              Cobrador:{' '}
              <span className="font-semibold">
                {collectors.find(c => c.id === lastClosingForSelectedCollector.collectorId)?.name || 'Sin nombre'}
              </span>{' '}
              · Fecha: {formatDate(lastClosingForSelectedCollector.date)}
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Total reportado: <span className="font-semibold">{formatCurrency(lastClosingForSelectedCollector.totalAmount)}</span>{' '}
              · Recibos: <span className="font-semibold">{lastClosingForSelectedCollector.receiptsCount}</span>
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl">
              {receiptsForLastClosing.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 text-center">
                  No se encontraron tickets para este cuadre. Verifica la fecha o el cobrador.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-right">Cuota</th>
                      <th className="p-2 text-right">Mora</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptsForLastClosing.map((r) => {
                      const base = parseFloat(r.amount || 0) || 0;
                      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
                      const total = base + penalty;
                      return (
                        <tr key={r.id}>
                          <td className="p-2 truncate max-w-[140px]">{r.clientName}</td>
                          <td className="p-2">{formatDate(r.date)}</td>
                          <td className="p-2 text-right">{formatCurrency(base)}</td>
                          <td className="p-2 text-right text-amber-600">{formatCurrency(penalty)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700">{formatCurrency(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowClosingDetail(false)}
              className="mt-4 w-full text-xs text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {paymentToConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmar cobro de ruta</h3>
            <p className="text-sm text-slate-600 mb-3">
              Vas a cobrar la cuota
              <span className="font-semibold"> #{paymentToConfirm.number}</span> del cliente
              <span className="font-semibold"> {paymentToConfirm.clientName}</span>.
            </p>
            <p className="text-sm text-slate-700 mb-1">
              <span className="font-semibold">Fecha programada:</span> {formatDate(paymentToConfirm.date)}
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <span className="font-semibold">Monto de la cuota:</span> {formatCurrency(paymentToConfirm.amount)}
            </p>
            {showPenaltyInput && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto de mora</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={penaltyAmountInput}
                  onChange={(e) => setPenaltyAmountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ej: 50.00"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const next = !showPenaltyInput;
                setShowPenaltyInput(next);
                if (!next) {
                  setPenaltyAmountInput('');
                }
              }}
              className="mb-3 text-xs text-amber-600 hover:text-amber-700 font-semibold"
            >
              {showPenaltyInput ? 'Quitar mora' : 'Agregar mora'}
            </button>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={() => {
                  const penalty = showPenaltyInput ? (parseFloat(penaltyAmountInput || '0') || 0) : 0;
                  if (penalty > 0) {
                    registerPayment(paymentToConfirm.loanId, paymentToConfirm.installmentId, {
                      withPenalty: true,
                      penaltyAmountOverride: penalty,
                    });
                  } else {
                    registerPayment(paymentToConfirm.loanId, paymentToConfirm.installmentId);
                  }
                  setPaymentToConfirm(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded-lg"
              >
                Confirmar pago
              </button>
            </div>
            <button
              onClick={() => setPaymentToConfirm(null)}
              className="mt-3 w-full text-xs text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutesView;
