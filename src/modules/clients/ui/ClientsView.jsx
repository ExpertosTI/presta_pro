import React, { useMemo, useState } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Users, Star, Search, Filter, Phone,
  FileSpreadsheet, Upload, ArrowUpDown, Plus, FileText,
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle,
  Mail, Calendar, UserCheck, ExternalLink
} from 'lucide-react';

// WhatsApp official logo SVG
const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Client score rating component
const ClientRating = ({ score }) => {
  const numScore = parseInt(score) || 70;
  const stars = Math.round(numScore / 20);

  const getScoreColor = (s) => {
    if (s >= 80) return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', star: 'text-emerald-500' };
    if (s >= 60) return { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', star: 'text-yellow-500' };
    if (s >= 40) return { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', star: 'text-orange-500' };
    return { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', star: 'text-red-500' };
  };

  const colors = getScoreColor(numScore);

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.bg}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={12}
            className={i <= stars ? colors.star : 'text-slate-300 dark:text-slate-600'}
            fill={i <= stars ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <span className={`text-xs font-bold ${colors.text}`}>{numScore}</span>
    </div>
  );
};

const getStatusLabel = (status) => {
  const map = {
    ACTIVE: 'Activo',
    PAID: 'Pagado',
    LATE: 'Atrasado',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    REVIEW: 'En revisión',
    COMPLETED: 'Completado',
  };
  return map[status] || status;
};

const getStatusColor = (status) => {
  const map = {
    ACTIVE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    PAID: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    LATE: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  return map[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
};

export function ClientsView({
  clients,
  loans,
  receipts = [],
  collectors = [],
  onNewClient,
  selectedClientId,
  onSelectClient,
  onSelectLoan,
  onEditClient,
  onDeleteClient,
  onCreateLoan,
  onUpdateClient,
  onNavigateToDocuments
}) {
  // MEJORA 1: Search
  const [searchQuery, setSearchQuery] = useState('');
  // MEJORA 2: Score filter
  const [scoreFilter, setScoreFilter] = useState('ALL');
  // MEJORA 8: Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  // MEJORA 4: Collector assignment modal
  const [showCollectorModal, setShowCollectorModal] = useState(false);
  // MEJORA 7: Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  // Tab for client detail
  const [activeTab, setActiveTab] = useState('info');

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // MEJORA 1, 2, 8: Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.idNumber || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    // Score filter
    if (scoreFilter !== 'ALL') {
      result = result.filter(c => {
        const score = parseInt(c.score) || 70;
        if (scoreFilter === 'EXCELLENT') return score >= 80;
        if (scoreFilter === 'GOOD') return score >= 60 && score < 80;
        if (scoreFilter === 'REGULAR') return score >= 40 && score < 60;
        if (scoreFilter === 'BAD') return score < 40;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortBy === 'score') {
        valA = parseInt(a.score) || 70;
        valB = parseInt(b.score) || 70;
      } else if (sortBy === 'date') {
        valA = new Date(a.createdAt || 0);
        valB = new Date(b.createdAt || 0);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchQuery, scoreFilter, sortBy, sortOrder]);

  const clientLoans = useMemo(
    () => (selectedClient ? loans.filter(l => l.clientId === selectedClient.id && !l.archived) : []),
    [loans, selectedClient],
  );

  // MEJORA 5: Client payment history
  const clientPayments = useMemo(() => {
    if (!selectedClient) return [];
    return receipts
      .filter(r => r.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }, [receipts, selectedClient]);

  // MEJORA 3: Client statistics
  const clientStats = useMemo(() => {
    if (!selectedClient) return null;

    const clientLoansAll = loans.filter(l => l.clientId === selectedClient.id);
    const totalLent = clientLoansAll.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalPaid = clientLoansAll.reduce((acc, l) => acc + (l.totalPaid || 0), 0);
    const activeLoansCount = clientLoansAll.filter(l => l.status === 'ACTIVE').length;
    const completedLoans = clientLoansAll.filter(l => l.status === 'COMPLETED' || l.status === 'PAID').length;

    // Calculate on-time vs late payments
    let onTimePayments = 0;
    let latePayments = 0;
    clientPayments.forEach(p => {
      if (p.wasLate || p.penaltyAmount > 0) {
        latePayments++;
      } else {
        onTimePayments++;
      }
    });

    return {
      totalLent,
      totalPaid,
      activeLoansCount,
      completedLoans,
      totalLoans: clientLoansAll.length,
      onTimePayments,
      latePayments,
      paymentScore: onTimePayments + latePayments > 0
        ? Math.round((onTimePayments / (onTimePayments + latePayments)) * 100)
        : 100
    };
  }, [selectedClient, loans, clientPayments]);

  // Get collector for client
  const clientCollector = useMemo(() => {
    if (!selectedClient?.collectorId) return null;
    return collectors.find(c => c.id === selectedClient.collectorId);
  }, [selectedClient, collectors]);

  // MEJORA 6: Export to CSV
  const exportToCSV = () => {
    const headers = ['Nombre', 'Teléfono', 'Cédula', 'Dirección', 'Email', 'Score', 'Notas'];
    const rows = filteredClients.map(c => [
      c.name || '',
      c.phone || '',
      c.idNumber || '',
      c.address || '',
      c.email || '',
      c.score || 70,
      (c.notes || '').replace(/,/g, ';')
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Toggle sort
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // MEJORA 4: Handle collector assignment
  const handleAssignCollector = async (collectorId) => {
    if (selectedClient && onEditClient) {
      // Use onEditClient to save the updated client with new collector
      await onEditClient({ ...selectedClient, collectorId });
      setShowCollectorModal(false);
    } else if (selectedClient && onUpdateClient) {
      await onUpdateClient({ ...selectedClient, collectorId });
      setShowCollectorModal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Clientes
          </h2>
          <p className="text-sm text-slate-500">{filteredClients.length} de {clients.length} clientes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* MEJORA 6: Export button */}
          <button
            onClick={exportToCSV}
            className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Exportar
          </button>
          {/* MEJORA 7: Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-sm bg-slate-600 text-white rounded-xl hover:bg-slate-700 flex items-center gap-2"
          >
            <Upload size={16} /> Importar
          </button>
          <button onClick={onNewClient} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700">
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* MEJORA 1 & 2: Search and Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Score filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Todos los scores</option>
            <option value="EXCELLENT">⭐ Excelente (80+)</option>
            <option value="GOOD">⭐ Bueno (60-79)</option>
            <option value="REGULAR">⭐ Regular (40-59)</option>
            <option value="BAD">⭐ Malo (0-39)</option>
          </select>

          {/* MEJORA 8: Sort dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
          >
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="score-desc">Mayor Score</option>
            <option value="score-asc">Menor Score</option>
            <option value="date-desc">Más reciente</option>
            <option value="date-asc">Más antiguo</option>
          </select>
        </div>
      </Card>

      {/* Client List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-2 text-left w-12"></th>
                <th className="p-2 text-left cursor-pointer hover:text-blue-600" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Nombre <ArrowUpDown size={12} /></span>
                </th>
                <th className="p-2 text-left hidden sm:table-cell">Teléfono</th>
                <th className="p-2 text-left hidden md:table-cell cursor-pointer hover:text-blue-600" onClick={() => toggleSort('score')}>
                  <span className="flex items-center gap-1">Score <ArrowUpDown size={12} /></span>
                </th>
                <th className="p-2 text-left hidden lg:table-cell">Cobrador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredClients.map(c => {
                const collector = collectors.find(col => col.id === c.collectorId);
                return (
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
                    <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="sm:hidden text-xs text-slate-500">{c.phone}</span>
                      </div>
                    </td>
                    <td className="p-2 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                      {/* MEJORA 9 & 10: Click to call and WhatsApp */}
                      <div className="flex items-center gap-2">
                        <a href={`tel:${c.phone}`} className="hover:text-blue-600" onClick={e => e.stopPropagation()}>
                          {c.phone}
                        </a>
                        {c.phone && (
                          <a
                            href={`https://wa.me/${(c.phone || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                            onClick={e => e.stopPropagation()}
                            title="WhatsApp"
                          >
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-2 hidden md:table-cell">
                      <ClientRating score={c.score} />
                    </td>
                    <td className="p-2 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                      {collector?.name || <span className="text-slate-400">Sin asignar</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400" colSpan={5}>
                    {searchQuery ? 'No se encontraron clientes.' : 'No hay clientes registrados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Client Detail */}
      {selectedClient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Client Info */}
          <Card className="lg:col-span-1">
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
                <p className="text-sm text-slate-500 dark:text-slate-400">ID: {selectedClient.idNumber || 'N/A'}</p>
                <ClientRating score={selectedClient.score} />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {/* MEJORA 9: Click to call */}
              <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <a href={`tel:${selectedClient.phone}`} className="hover:text-blue-600">{selectedClient.phone || 'N/D'}</a>
                {selectedClient.phone && (
                  <a
                    href={`https://wa.me/${(selectedClient.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                    title="WhatsApp"
                  >
                    <WhatsAppIcon size={14} />
                  </a>
                )}
              </p>
              {/* MEJORA 14: Email */}
              {selectedClient.email && (
                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <a href={`mailto:${selectedClient.email}`} className="hover:text-blue-600">{selectedClient.email}</a>
                </p>
              )}
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Dirección: </span>{selectedClient.address || 'N/D'}
              </p>
              {/* MEJORA 15: Birthday */}
              {selectedClient.birthDate && (
                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  {formatDate(selectedClient.birthDate)}
                </p>
              )}
              {/* MEJORA 4: Collector */}
              <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <UserCheck size={14} className="text-slate-400" />
                <span className="font-semibold">Cobrador: </span>
                {clientCollector?.name || 'Sin asignar'}
                <button
                  onClick={() => setShowCollectorModal(true)}
                  className="text-blue-600 hover:text-blue-700 text-xs underline"
                >
                  Cambiar
                </button>
              </p>
              {selectedClient.notes && (
                <p className="text-slate-700 dark:text-slate-300 mt-2">
                  <span className="font-semibold">Notas: </span>{selectedClient.notes}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onEditClient && onEditClient(selectedClient)}
                className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
              >
                Editar
              </button>
              {/* MEJORA 13: Quick new loan */}
              {onCreateLoan && (
                <button
                  onClick={() => onCreateLoan(selectedClient.id)}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Nuevo Préstamo
                </button>
              )}
              {/* MEJORA 12: Documents */}
              {onNavigateToDocuments && (
                <button
                  onClick={() => onNavigateToDocuments(selectedClient.id)}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors flex items-center gap-1"
                >
                  <FileText size={14} /> Documentos
                </button>
              )}
              <button
                onClick={() => onDeleteClient && onDeleteClient(selectedClient)}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Eliminar
              </button>
            </div>
          </Card>

          {/* Right: Stats and Loans/Payments */}
          <div className="lg:col-span-2 space-y-4">
            {/* MEJORA 3: Client Statistics */}
            {clientStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Total Prestado</p>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(clientStats.totalLent)}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Total Pagado</p>
                  <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(clientStats.totalPaid)}</p>
                </div>
                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">Préstamos</p>
                  <p className="text-xl font-bold text-violet-800 dark:text-violet-200">{clientStats.activeLoansCount} activos</p>
                  <p className="text-xs text-violet-600">{clientStats.completedLoans} completados</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Puntualidad</p>
                  <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{clientStats.paymentScore}%</p>
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <CheckCircle size={10} /> {clientStats.onTimePayments} a tiempo
                  </p>
                </div>
              </div>
            )}

            {/* Tabs: Loans and Payments */}
            <Card>
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                <button
                  onClick={() => setActiveTab('loans')}
                  className={`px-4 py-2 text-sm font-semibold ${activeTab === 'loans' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Préstamos ({clientLoans.length})
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-4 py-2 text-sm font-semibold ${activeTab === 'payments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Historial de Pagos ({clientPayments.length})
                </button>
              </div>

              {activeTab === 'loans' && (
                <>
                  {clientLoans.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Este cliente no tiene préstamos activos.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                      {clientLoans.map(l => (
                        <li
                          key={l.id}
                          className="py-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 transition-colors"
                          onClick={() => onSelectLoan && onSelectLoan(l.id)}
                        >
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(l.amount)} • {l.rate}%
                            </p>
                            <p className="text-xs text-slate-500">{l.term} cuotas · {l.frequency}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(l.status)}`}>
                            {getStatusLabel(l.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* MEJORA 5: Payment History */}
              {activeTab === 'payments' && (
                <>
                  {clientPayments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No hay pagos registrados.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm max-h-64 overflow-y-auto">
                      {clientPayments.map(p => (
                        <li key={p.id} className="py-2 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(parseFloat(p.amount || 0) + parseFloat(p.penaltyAmount || 0))}</p>
                            <p className="text-xs text-slate-500">{formatDate(p.date)} · Cuota #{p.installmentNumber || '?'}</p>
                          </div>
                          {p.penaltyAmount > 0 ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={12} /> Mora {formatCurrency(p.penaltyAmount)}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle size={12} /> A tiempo
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* MEJORA 4: Collector Assignment Modal */}
      {showCollectorModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Asignar Cobrador</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAssignCollector(null)}
                className={`w-full p-3 text-left rounded-lg border ${!selectedClient.collectorId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'} hover:bg-slate-50 dark:hover:bg-slate-700`}
              >
                Sin asignar
              </button>
              {collectors.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAssignCollector(c.id)}
                  className={`w-full p-3 text-left rounded-lg border ${selectedClient.collectorId === c.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'} hover:bg-slate-50 dark:hover:bg-slate-700`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCollectorModal(false)}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MEJORA 7: Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Importar Clientes</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Sube un archivo CSV con las columnas: Nombre, Teléfono, Cédula, Dirección, Email, Notas
            </p>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  // Handle CSV import
                  const file = e.target.files[0];
                  if (file) {
                    // TODO: Process CSV file
                    alert('Función de importación próximamente disponible');
                  }
                }}
                className="hidden"
                id="csv-import"
              />
              <label htmlFor="csv-import" className="cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Click para seleccionar archivo CSV</p>
              </label>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsView;
