import React, { useState, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { Download } from 'lucide-react';
import { generateReceiptPDF } from '../../../services/pdfService';

function CuadreView({ receipts = [], expenses = [], clients = [], collectors = [], routeClosings = [] }) {
  const [closingDetail, setClosingDetail] = useState(null);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const receiptsToday = receipts.filter((r) => {
    const d = new Date(r.date);
    return d >= startOfToday && d < endOfToday;
  });

  const expensesToday = expenses.filter((g) => {
    if (!g.date) return true;
    const d = new Date(g.date);
    return d >= startOfToday && d < endOfToday;
  });

  const totalIngresos = receiptsToday.reduce((acc, r) => {
    const base = parseFloat(r.amount || 0) || 0;
    const penalty = parseFloat(r.penaltyAmount || 0) || 0;
    return acc + base + penalty;
  }, 0);

  const totalGastos = expensesToday.reduce(
    (acc, g) => acc + (parseFloat(g.amount || 0) || 0),
    0,
  );
  const balance = totalIngresos - totalGastos;

  const totalPenalty = receiptsToday.reduce(
    (acc, r) => acc + (parseFloat(r.penaltyAmount || 0) || 0),
    0,
  );
  const totalBaseIngresos = totalIngresos - totalPenalty;

  const lastReceipts = receiptsToday
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const lastExpenses = expensesToday
    .slice()
    .sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    })
    .slice(0, 5);

  const collectorMap = new Map();
  receiptsToday.forEach((r) => {
    const client = clients.find((c) => c.id === r.clientId);
    const collectorId = client?.collectorId || 'UNASSIGNED';
    const collectorName =
      collectorId === 'UNASSIGNED'
        ? 'Sin asignar'
        : collectors.find((col) => col.id === collectorId)?.name || 'Sin nombre';

    const base = parseFloat(r.amount || 0) || 0;
    const penalty = parseFloat(r.penaltyAmount || 0) || 0;
    const total = base + penalty;

    if (!collectorMap.has(collectorId)) {
      collectorMap.set(collectorId, {
        id: collectorId,
        name: collectorName,
        totalAmount: 0,
        receiptsCount: 0,
      });
    }
    const entry = collectorMap.get(collectorId);
    entry.totalAmount += total;
    entry.receiptsCount += 1;
  });

  const collectorsSummary = Array.from(collectorMap.values());

  const collectorsWithClosing = collectorsSummary.map((c) => {
    const lastClosing = routeClosings.find((cl) => cl.collectorId === c.id) || null;
    const closingAmount = lastClosing ? lastClosing.totalAmount || 0 : 0;
    const diff = c.totalAmount - closingAmount;
    return {
      ...c,
      lastClosing,
      closingAmount,
      diff,
    };
  });

  const receiptsForClosing = useMemo(() => {
    if (!closingDetail) return [];
    const { collectorId, date } = closingDetail;
    if (!collectorId || !date) return [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return receipts.filter((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      if (!client || client.collectorId !== collectorId) return false;
      const d = new Date(r.date);
      return d >= startOfDay && d < endOfDay;
    });
  }, [closingDetail, receipts, clients]);

  const totalClosingAmountFromReceipts = useMemo(() => {
    return receiptsForClosing.reduce((acc, r) => {
      const base = parseFloat(r.amount || 0) || 0;
      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
      return acc + base + penalty;
    }, 0);
  }, [receiptsForClosing]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cuadre de Caja</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">
            <p className="text-xs font-semibold uppercase tracking-wide">Ingresos del día</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalIngresos)}</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300">
            <p className="text-xs font-semibold uppercase tracking-wide">Gastos del día</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalGastos)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide">Balance del día</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Detalle de ingresos
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cuotas (sin mora)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalBaseIngresos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mora cobrada</span>
                <span className="font-semibold text-amber-700 dark:text-amber-500">
                  {formatCurrency(totalPenalty)}
                </span>
              </div>
              <div className="pt-2">
                <div className="h-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width:
                        totalIngresos > 0
                          ? `${Math.min(
                            ((totalBaseIngresos / totalIngresos) * 100).toFixed(1),
                            100,
                          )}%`
                          : '0%',
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {receiptsToday.length} recibos hoy · {formatCurrency(totalIngresos)} en total.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Detalle de gastos
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Gastos registrados hoy</span>
                <span className="font-semibold text-rose-700 dark:text-rose-500">
                  {formatCurrency(totalGastos)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {expensesToday.length === 0
                  ? 'No hay gastos registrados hoy.'
                  : `${expensesToday.length} movimiento(s) de gasto.`}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Desglose por cobrador (hoy)</h3>
        {collectorsWithClosing.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Hoy no se han registrado cobros.</p>
        ) : (
          <div className="overflow-x-auto text-xs md:text-sm">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-2 text-left">Cobrador</th>
                  <th className="p-2 text-right">Recibos hoy</th>
                  <th className="p-2 text-right">Cobrado hoy</th>
                  <th className="p-2 text-right">Último cuadre</th>
                  <th className="p-2 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {collectorsWithClosing.map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{c.receiptsCount}</td>
                    <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(c.totalAmount)}</td>
                    <td className="p-2 text-right">
                      {c.lastClosing ? (
                        <button
                          type="button"
                          onClick={() => setClosingDetail({ collectorId: c.id, date: c.lastClosing.date, closingAmount: c.closingAmount })}
                          className="text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          {formatCurrency(c.closingAmount)}
                        </button>
                      ) : (
                        <span className="text-slate-400">{formatCurrency(c.closingAmount)}</span>
                      )}
                    </td>
                    <td
                      className={`p-2 text-right font-semibold ${c.diff === 0
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : c.diff > 0
                          ? 'text-amber-600 dark:text-amber-500'
                          : 'text-rose-600 dark:text-rose-500'
                        }`}
                    >
                      {formatCurrency(c.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Movimientos del día</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Últimos cobros</h4>
            {lastReceipts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No hay cobros registrados hoy.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {lastReceipts.map((r) => {
                  const client = clients.find((c) => c.id === r.clientId);
                  const clientName = client?.name || 'Cliente sin nombre';
                  const base = parseFloat(r.amount || 0) || 0;
                  const penalty = parseFloat(r.penaltyAmount || 0) || 0;
                  const total = base + penalty;
                  return (
                    <li
                      key={r.id}
                      className="py-2 flex justify-between items-center"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] md:max-w-[220px]">
                          {clientName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(r.date)} · {penalty > 0 ? 'Cuota + mora' : 'Cuota'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-500">
                          {formatCurrency(total)}
                        </p>
                        {penalty > 0 && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-500">
                            Mora {formatCurrency(penalty)}
                          </p>
                        )}
                        <button
                          onClick={() => generateReceiptPDF(r)}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ml-2 inline-block"
                          title="Descargar PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Últimos gastos</h4>
            {lastExpenses.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No hay gastos registrados hoy.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {lastExpenses.map((g, idx) => {
                  const label = g.description || g.concept || g.category || `Gasto #${idx + 1}`;
                  const amount = parseFloat(g.amount || 0) || 0;
                  return (
                    <li
                      key={g.id || `${label}-${idx}`}
                      className="py-2 flex justify-between items-center"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] md:max-w-[220px]">
                          {label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {g.date ? formatDate(g.date) : 'Sin fecha'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-rose-700 dark:text-rose-500">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {closingDetail && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Tickets cobrados en el cuadre</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Cobrador:{' '}
              <span className="font-semibold">
                {collectors.find(c => c.id === closingDetail.collectorId)?.name || 'Sin nombre'}
              </span>{' '}
              · Fecha: {formatDate(closingDetail.date)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Total de cierre (registro):{' '}
              <span className="font-semibold">{formatCurrency(closingDetail.closingAmount || 0)}</span>{' '}
              · Total por tickets listados:{' '}
              <span className="font-semibold">{formatCurrency(totalClosingAmountFromReceipts)}</span>
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              {receiptsForClosing.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                  No se encontraron tickets para este cuadre. Verifica la fecha o el cobrador.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-right">Cuota</th>
                      <th className="p-2 text-right">Mora</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {receiptsForClosing.map((r) => {
                      const base = parseFloat(r.amount || 0) || 0;
                      const penalty = parseFloat(r.penaltyAmount || 0) || 0;
                      const total = base + penalty;
                      return (
                        <tr key={r.id}>
                          <td className="p-2 truncate max-w-[140px] text-slate-800 dark:text-slate-200">{r.clientName}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{formatDate(r.date)}</td>
                          <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(base)}</td>
                          <td className="p-2 text-right text-amber-600 dark:text-amber-500">{formatCurrency(penalty)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700 dark:text-emerald-500">{formatCurrency(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <button
              type="button"
              onClick={() => setClosingDetail(null)}
              className="mt-4 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CuadreView;
