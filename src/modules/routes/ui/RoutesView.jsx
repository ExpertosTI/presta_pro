import React, { useMemo, useState } from 'react';
import Card from '../../../shared/components/ui/Card';
import {
  MapPin, CheckCircle, Printer, Search, Phone, Navigation,
  Clock, XCircle, AlertTriangle, StickyNote, ArrowUpDown,
  TrendingUp, PlusCircle, Filter, Users
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import DigitalReceipt from '../../../components/DigitalReceipt';
import { PaymentConfirmationModal } from '../../payments';

// WhatsApp icon
const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// MEJORA 5: Visit status options
const VISIT_STATUSES = [
  { value: 'PENDING', label: 'Pendiente', color: 'slate', icon: Clock },
  { value: 'VISITED', label: 'Visitado', color: 'blue', icon: CheckCircle },
  { value: 'NOT_HOME', label: 'No estaba', color: 'amber', icon: XCircle },
  { value: 'REFUSED', label: 'Rechazó', color: 'rose', icon: AlertTriangle },
  { value: 'PAID', label: 'Pagó', color: 'emerald', icon: CheckCircle }
];

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
  handlePrint,
  setPrintReceipt,
  systemSettings,
}) {
  const [collectorFilter, setCollectorFilter] = useState('');
  const [confirmClosing, setConfirmClosing] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
  const [confirmClearRoute, setConfirmClearRoute] = useState(false);
  const [showPenaltyInput, setShowPenaltyInput] = useState(false);
  const [showClosingDetail, setShowClosingDetail] = useState(false);
  const [receiptToShow, setReceiptToShow] = useState(null);

  // MEJORA 1: Search
  const [searchQuery, setSearchQuery] = useState('');

  // MEJORA 7: Sort options
  const [sortBy, setSortBy] = useState('address');
  const [sortOrder, setSortOrder] = useState('asc');

  // MEJORA 12: Zone filter
  const [zoneFilter, setZoneFilter] = useState('ALL');

  // MEJORA 5 & 6: Visit status and notes (local state)
  const [visitStatuses, setVisitStatuses] = useState({});
  const [visitNotes, setVisitNotes] = useState({});
  const [notesModal, setNotesModal] = useState(null);

  // Extract unique zones from addresses
  const zones = useMemo(() => {
    const zoneSet = new Set();
    clients.forEach(c => {
      if (c.address) {
        // Extract zone/sector from address (first part before comma or number)
        const zone = c.address.split(',')[0]?.split(/\d/)[0]?.trim();
        if (zone && zone.length > 2) zoneSet.add(zone);
      }
    });
    return Array.from(zoneSet).sort();
  }, [clients]);

  const { pendingCollections, sortedRoute, totalToCollect, selectedStops, collectorTodayTotal, collectorTodayCount, paidTodayCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = loans.flatMap(loan => {
      const client = clients.find(c => c.id === loan.clientId);
      if (!client) return [];

      if (!loan.schedule || !Array.isArray(loan.schedule)) return [];

      if (collectorFilter && client.collectorId !== collectorFilter) return [];

      // MEJORA 12: Zone filter
      if (zoneFilter !== 'ALL') {
        const clientZone = client.address?.split(',')[0]?.split(/\d/)[0]?.trim();
        if (clientZone !== zoneFilter) return [];
      }

      const pendingInstallment = loan.schedule.find(s => s.status !== 'PAID');
      if (!pendingInstallment) return [];

      if (!includeFutureInstallments) {
        const dueDate = new Date(pendingInstallment.date);
        if (dueDate > today) return [];
      }

      return [{
        ...pendingInstallment,
        loanId: loan.id,
        clientId: client.id,
        clientName: client?.name,
        clientAddress: client?.address,
        clientPhone: client?.phone,
        clientPhotoUrl: client?.photoUrl,
        totalDue: pendingInstallment.payment,
      }];
    });

    // MEJORA 1: Search filter
    let filtered = pending;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = pending.filter(stop =>
        stop.clientName?.toLowerCase().includes(q) ||
        stop.clientAddress?.toLowerCase().includes(q)
      );
    }

    // MEJORA 7: Sorting
    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'name':
          valA = a.clientName?.toLowerCase() || '';
          valB = b.clientName?.toLowerCase() || '';
          break;
        case 'amount':
          valA = a.payment || 0;
          valB = b.payment || 0;
          break;
        case 'number':
          valA = a.number || 0;
          valB = b.number || 0;
          break;
        case 'address':
        default:
          valA = a.clientAddress?.toLowerCase() || '';
          valB = b.clientAddress?.toLowerCase() || '';
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = sorted.reduce((acc, i) => acc + i.payment, 0);
    const selected = sorted.filter(stop =>
      currentRouteLoanIds.includes(`${stop.loanId}:${stop.id}`)
    );

    // Calculate collector stats
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
          const penalty = parseFloat(r.penalty || 0) || 0;
          collectorTodayTotal += (amount + penalty);
          collectorTodayCount += 1;
        }
      });
    }

    // Count paid today from visit statuses
    const paidTodayCount = Object.values(visitStatuses).filter(s => s === 'PAID').length;

    return {
      pendingCollections: pending,
      sortedRoute: sorted,
      totalToCollect: total,
      selectedStops: selected,
      collectorTodayTotal,
      collectorTodayCount,
      paidTodayCount
    };
  }, [loans, clients, collectorFilter, currentRouteLoanIds, receipts, searchQuery, sortBy, sortOrder, zoneFilter, visitStatuses, includeFutureInstallments]);

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

  // MEJORA 8: Daily progress stats
  const progressStats = useMemo(() => {
    const totalStops = sortedRoute.length;
    const paidCount = Object.values(visitStatuses).filter(s => s === 'PAID').length;
    const visitedCount = Object.values(visitStatuses).filter(s => s !== 'PENDING' && s !== undefined).length;
    const progressPercent = totalStops > 0 ? Math.round((visitedCount / totalStops) * 100) : 0;
    const collectionPercent = totalStops > 0 ? Math.round((paidCount / totalStops) * 100) : 0;

    return { totalStops, paidCount, visitedCount, progressPercent, collectionPercent };
  }, [sortedRoute, visitStatuses]);

  // MEJORA 11: Add all to route
  const handleAddAllToRoute = () => {
    sortedRoute.forEach(stop => {
      const key = `${stop.loanId}:${stop.id}`;
      if (!currentRouteLoanIds.includes(key)) {
        toggleLoanInRoute(stop.loanId, stop.id);
      }
    });
    showToast?.(`${sortedRoute.length} paradas agregadas a la ruta`, 'success');
  };

  // MEJORA 5: Update visit status
  const updateVisitStatus = (stopId, status) => {
    setVisitStatuses(prev => ({ ...prev, [stopId]: status }));
  };

  // MEJORA 6: Save visit note
  const saveVisitNote = (stopId, note) => {
    setVisitNotes(prev => ({ ...prev, [stopId]: note }));
    setNotesModal(null);
    showToast?.('Nota guardada', 'success');
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const found = VISIT_STATUSES.find(s => s.value === status);
    if (!found) return null;
    const Icon = found.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-${found.color}-100 dark:bg-${found.color}-900/30 text-${found.color}-700 dark:text-${found.color}-300`}>
        <Icon size={10} /> {found.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-600 text-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-lg">
        <div>
          <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2">
            <MapPin size={20} className="md:w-6 md:h-6" /> Ruta de Cobros
          </h2>
          <p className="text-xs md:text-sm opacity-80">Optimización por zona</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold">{sortedRoute.length}</p>
            <p className="text-[10px] md:text-xs uppercase tracking-wider">Paradas</p>
          </div>
          <div className="text-center">
            <p className="text-lg md:text-xl font-bold text-emerald-300">{formatCurrency(totalToCollect)}</p>
            <p className="text-[10px] md:text-xs uppercase tracking-wider">Por cobrar</p>
          </div>
        </div>
      </div>

      {/* MEJORA 8: Daily Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <Users size={12} /> Progreso
          </p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{progressStats.visitedCount}/{progressStats.totalStops}</p>
          <p className="text-xs text-blue-600">{progressStats.progressPercent}% visitados</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp size={12} /> Cobrado Hoy
          </p>
          <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(collectorTodayTotal)}</p>
          <p className="text-xs text-emerald-600">{collectorTodayCount} recibos</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Pendiente</p>
          <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{formatCurrency(totalToCollect - collectorTodayTotal)}</p>
          <p className="text-xs text-amber-600">{sortedRoute.length - progressStats.paidCount} paradas</p>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
          <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">Efectividad</p>
          <p className="text-lg font-bold text-violet-800 dark:text-violet-200">{progressStats.collectionPercent}%</p>
          <p className="text-xs text-violet-600">{progressStats.paidCount} pagaron</p>
        </div>
      </div>

      {/* MEJORA 9: Progress Bar */}
      {sortedRoute.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Progreso de la ruta</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{progressStats.progressPercent}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressStats.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-slate-500">
            <span>{progressStats.visitedCount} visitados</span>
            <span>{progressStats.paidCount} pagaron</span>
            <span>{progressStats.totalStops - progressStats.visitedCount} restantes</span>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Collector filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Cobrador:</span>
            <select
              className="p-2 border rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-slate-200 dark:border-slate-700"
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

          {/* MEJORA 12: Zone filter */}
          {zones.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                className="p-2 border rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-slate-200 dark:border-slate-700"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="ALL">Todas las zonas</option>
                {zones.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          )}

          {/* MEJORA 7: Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              className="p-2 border rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-slate-200 dark:border-slate-700"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="address">Por Dirección</option>
              <option value="name">Por Nombre</option>
              <option value="amount">Por Monto</option>
              <option value="number">Por Cuota #</option>
            </select>
          </div>
        </div>

        {/* MEJORA 1: Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={startRoute}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-semibold shadow-md hover:bg-emerald-700"
          >
            <MapPin size={14} /> {routeActive ? 'En curso' : 'Iniciar'}
          </button>

          {/* MEJORA 11: Add all button */}
          <button
            type="button"
            onClick={handleAddAllToRoute}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-blue-700"
          >
            <PlusCircle size={14} /> Agregar todos
          </button>

          <button
            type="button"
            onClick={() => {
              if (!collectorFilter) {
                showToast && showToast('Selecciona un cobrador para cuadrar la ruta.', 'error');
                return;
              }
              setConfirmClosing(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-slate-600"
          >
            Cerrar Cuadre
          </button>
          <button
            type="button"
            onClick={() => {
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
                showToast && showToast('Presiona de nuevo para confirmar limpieza de ruta.', 'info');
                return;
              }

              clearCurrentRoute();
              setConfirmClearRoute(false);
              setVisitStatuses({});
              setVisitNotes({});
              showToast && showToast('Ruta limpiada.', 'success');
            }}
            className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-300"
          >
            {confirmClearRoute ? 'Confirmar' : 'Limpiar'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:bg-slate-800"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Route List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {sortedRoute.map((stop, index) => {
            const key = `${stop.loanId}:${stop.id}`;
            const selected = currentRouteLoanIds.includes(key);
            const status = visitStatuses[stop.id] || 'PENDING';
            const note = visitNotes[stop.id];

            return (
              <div
                key={stop.id}
                className={`glass p-4 rounded-xl transition-all ${status === 'PAID' ? 'opacity-60 border-emerald-300' :
                  status === 'REFUSED' || status === 'NOT_HOME' ? 'opacity-75 border-amber-300' : ''
                  }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                  {/* Client info */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      {stop.clientPhotoUrl ? (
                        <img src={stop.clientPhotoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                          {stop.clientName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{stop.clientName}</h4>
                        {getStatusBadge(status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <MapPin size={10} /> {stop.clientAddress}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Cuota #{stop.number} • {formatDate(stop.date)} • <span className="font-semibold">{formatCurrency(stop.payment)}</span>
                      </p>
                      {note && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <StickyNote size={10} /> {note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    {/* Quick actions: GPS, Call, WhatsApp */}
                    <div className="flex items-center gap-1 justify-end">
                      {/* MEJORA 2: GPS Navigation */}
                      {stop.clientAddress && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200"
                          title="Navegar con GPS"
                        >
                          <Navigation size={14} />
                        </a>
                      )}
                      {/* MEJORA 3: Call */}
                      {stop.clientPhone && (
                        <a
                          href={`tel:${stop.clientPhone}`}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200"
                          title="Llamar"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                      {/* MEJORA 4: WhatsApp */}
                      {stop.clientPhone && (
                        <a
                          href={`https://wa.me/${stop.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${stop.clientName}, le recordamos que tiene una cuota pendiente de ${formatCurrency(stop.payment)}. ¿Estará disponible hoy para realizar el pago?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon size={14} />
                        </a>
                      )}
                      {/* MEJORA 6: Notes */}
                      <button
                        onClick={() => setNotesModal(stop)}
                        className={`p-1.5 rounded-lg ${note ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}
                        title="Notas"
                      >
                        <StickyNote size={14} />
                      </button>
                      {/* Add/Remove from route */}
                      <button
                        type="button"
                        onClick={() => toggleLoanInRoute(stop.loanId, stop.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${selected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {selected ? '✓ En ruta' : '+ Agregar'}
                      </button>
                    </div>

                    {/* MEJORA 5: Visit status selector */}
                    <div className="flex items-center gap-1">
                      {VISIT_STATUSES.filter(s => s.value !== 'PENDING').map(s => (
                        <button
                          key={s.value}
                          onClick={() => updateVisitStatus(stop.id, s.value)}
                          className={`p-1 rounded text-[10px] ${status === s.value ? `bg-${s.color}-500 text-white` : `bg-${s.color}-100 text-${s.color}-600 hover:bg-${s.color}-200`}`}
                          title={s.label}
                        >
                          <s.icon size={12} />
                        </button>
                      ))}
                    </div>

                    {/* Collect button */}
                    {status !== 'PAID' && (
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
                        className="w-full bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-500 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} /> Cobrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {sortedRoute.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">¡Ruta Completada!</h3>
              <p className="text-slate-500 dark:text-slate-400">No hay cobros pendientes.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Resumen de Ruta</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total a Recaudar</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totalToCollect)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cobrado Hoy</span>
                <span className="font-bold text-emerald-600">{formatCurrency(collectorTodayTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Clientes en Ruta</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStops.length}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Ruta Armada</h3>
            {selectedStops.length === 0 ? (
              <p className="text-xs text-slate-400">Selecciona clientes para armar la ruta.</p>
            ) : (
              <div className="space-y-2 text-xs">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
                  {selectedStops.map((stop) => (
                    <li key={stop.id} className="py-1 flex justify-between">
                      <span className="truncate mr-2">{stop.clientName}</span>
                      <span className="font-semibold">{formatCurrency(stop.payment)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">{formatCurrency(selectedStops.reduce((acc, s) => acc + s.payment, 0))}</span>
                </div>
              </div>
            )}
          </Card>

          {lastClosingForSelectedCollector && (
            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2 text-sm">Último cuadre</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {formatDate(lastClosingForSelectedCollector.date)} • {lastClosingForSelectedCollector.receiptsCount} recibos
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(lastClosingForSelectedCollector.totalAmount)}
              </p>
              <button
                type="button"
                onClick={() => setShowClosingDetail(true)}
                className="mt-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 underline"
              >
                Ver tickets
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* MEJORA 6: Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <StickyNote size={20} className="text-amber-500" />
              Notas de Visita
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{notesModal.clientName}</p>
            <textarea
              defaultValue={visitNotes[notesModal.id] || ''}
              placeholder="Escribe observaciones..."
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[100px]"
              id="visitNoteInput"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setNotesModal(null)}
                className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('visitNoteInput');
                  saveVisitNote(notesModal.id, input?.value || '');
                }}
                className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-500"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Detail Modal */}
      {showClosingDetail && lastClosingForSelectedCollector && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Tickets del cuadre</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {collectors.find(c => c.id === lastClosingForSelectedCollector.collectorId)?.name} • {formatDate(lastClosingForSelectedCollector.date)}
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              {receiptsForLastClosing.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 text-center">No se encontraron tickets.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-right">Cuota</th>
                      <th className="p-2 text-right">Mora</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {receiptsForLastClosing.map((r) => {
                      const base = parseFloat(r.amount || 0);
                      const penalty = parseFloat(r.penaltyAmount || 0);
                      return (
                        <tr key={r.id}>
                          <td className="p-2 truncate max-w-[140px]">{r.clientName}</td>
                          <td className="p-2 text-right">{formatCurrency(base)}</td>
                          <td className="p-2 text-right text-amber-600">{formatCurrency(penalty)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700">{formatCurrency(base + penalty)}</td>
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

      {/* Closing Confirmation Modal */}
      {confirmClosing && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Confirmar Cuadre
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Cobrador: <span className="font-semibold text-slate-700 dark:text-slate-200">
                {collectors.find(c => c.id === collectorFilter)?.name}
              </span>
            </p>

            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-6 mb-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1 uppercase tracking-wider font-semibold">
                Total a Recibir
              </p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(collectorTodayTotal || 0)}
              </p>
            </div>

            <div className="flex justify-center gap-6 mb-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{collectorTodayCount || 0}</p>
                <p className="text-slate-500 dark:text-slate-400">Recibos</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClosing(false)}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  addRouteClosing && addRouteClosing({
                    collectorId: collectorFilter,
                    date: new Date().toISOString(),
                    totalAmount: collectorTodayTotal || 0,
                    receiptsCount: collectorTodayCount || 0,
                  });
                  finishRoute && finishRoute();
                  setConfirmClosing(false);
                  showToast && showToast('Cuadre registrado correctamente.', 'success');
                }}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 shadow-lg"
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {paymentToConfirm && (
        <PaymentConfirmationModal
          paymentToConfirm={paymentToConfirm}
          onConfirm={async (loanId, installmentId, options) => {
            const receipt = await registerPayment(loanId, installmentId, { ...options, suppressAutoPrint: true });
            if (receipt) {
              setReceiptToShow(receipt);
              updateVisitStatus(installmentId, 'PAID');
            }
            setPaymentToConfirm(null);
          }}
          onCancel={() => setPaymentToConfirm(null)}
        />
      )}

      {/* Receipt Display */}
      {receiptToShow && (
        <DigitalReceipt
          receipt={receiptToShow}
          companyName={systemSettings?.companyName || 'Presta Pro'}
          companyLogo={systemSettings?.companyLogo}
          onClose={() => setReceiptToShow(null)}
          onPrint={async () => {
            // Use printTextReceipt (Odoo POS style plain text for 58mm thermal)
            const { printTextReceipt } = await import('../../../shared/utils/printUtils');
            printTextReceipt(receiptToShow, {
              companyName: systemSettings?.companyName || 'Presta Pro'
            });
          }}
        />
      )}
    </div>
  );
}

export default RoutesView;
