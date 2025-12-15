import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  X, FileText, PlusCircle, Clock, CheckCircle, XCircle,
  Edit3, Send, StickyNote, Calendar, Filter
} from 'lucide-react';
import loanRequestService from '../services/loanRequestService';

// WhatsApp icon for notification
const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function RequestsView({ clients, showToast, onNewClient, onCreateLoan }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // MEJORA 2: Status tabs
  const [activeTab, setActiveTab] = useState('REVIEW');

  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    rate: '',
    term: '',
    frequency: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
    // MEJORA 8: Amortization type
    amortizationType: 'FLAT',
    // MEJORA 9: Internal notes
    notes: ''
  });

  // Modal para gastos de cierre
  const [approvalModal, setApprovalModal] = useState(null);
  const [closingCostsInput, setClosingCostsInput] = useState('0');
  // MEJORA 6: Notify client
  const [notifyClient, setNotifyClient] = useState(false);

  // MEJORA 4: Reject reason modal
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // MEJORA 15: Edit request modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await loanRequestService.getLoanRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast?.('Error cargando solicitudes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // MEJORA 2: Filter requests by tab
  const filteredRequests = useMemo(() => {
    if (activeTab === 'ALL') return requests;
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  // Counts for tabs
  const counts = useMemo(() => ({
    REVIEW: requests.filter(r => r.status === 'REVIEW').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    ALL: requests.length
  }), [requests]);

  const addRequest = async (formData) => {
    try {
      setSaving(true);
      const newRequest = await loanRequestService.createLoanRequest({
        clientId: formData.clientId,
        amount: parseFloat(formData.amount),
        rate: parseFloat(formData.rate),
        term: parseInt(formData.term),
        frequency: formData.frequency,
        startDate: formData.startDate,
        amortizationType: formData.amortizationType,
        notes: formData.notes
      });
      setRequests(prev => [newRequest, ...prev]);
      setForm({
        clientId: '',
        amount: '',
        rate: '',
        term: '',
        frequency: 'Mensual',
        startDate: new Date().toISOString().split('T')[0],
        amortizationType: 'FLAT',
        notes: ''
      });
      showToast?.('Solicitud creada', 'success');
    } catch (error) {
      console.error('Error creating request:', error);
      showToast?.('Error al crear solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveClick = (req) => {
    setApprovalModal(req);
    setClosingCostsInput('0');
    setNotifyClient(false);
  };

  const handleConfirmApproval = async () => {
    if (!approvalModal) return;

    try {
      setSaving(true);
      await loanRequestService.approveLoanRequest(approvalModal.id);

      // Create the loan from the approved request
      const client = clients.find(c => c.id === approvalModal.clientId);
      if (onCreateLoan) {
        const closingCosts = parseFloat(closingCostsInput) || 0;
        const baseAmount = parseFloat(approvalModal.amount);
        onCreateLoan({
          clientId: approvalModal.clientId,
          clientName: client?.name,
          amount: baseAmount + closingCosts,
          closingCosts: closingCosts,
          rate: parseFloat(approvalModal.rate),
          term: parseInt(approvalModal.term),
          frequency: approvalModal.frequency || 'Mensual',
          amortizationType: approvalModal.amortizationType || 'FLAT',
          startDate: approvalModal.startDate
            ? (typeof approvalModal.startDate === 'string' ? approvalModal.startDate.split('T')[0] : new Date(approvalModal.startDate).toISOString().split('T')[0])
            : new Date().toISOString().split('T')[0]
        });
      }

      // Update local state
      setRequests(prev => prev.map(r =>
        r.id === approvalModal.id ? { ...r, status: 'APPROVED', approvedAt: new Date().toISOString() } : r
      ));

      // MEJORA 6: Send notification
      if (notifyClient && client?.phone) {
        const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${client.name}! Tu solicitud de crédito por ${formatCurrency(approvalModal.amount)} ha sido APROBADA. Pronto te contactaremos para los detalles.`)}`;
        window.open(whatsappUrl, '_blank');
      }

      showToast?.('Solicitud aprobada y préstamo creado', 'success');
      setApprovalModal(null);
      setClosingCostsInput('0');
    } catch (error) {
      console.error('Error approving request:', error);
      showToast?.('Error al aprobar solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  // MEJORA 4: Reject with reason
  const handleRejectClick = (req) => {
    setRejectModal(req);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    try {
      setSaving(true);
      await loanRequestService.rejectLoanRequest(rejectModal.id);
      setRequests(prev => prev.map(r =>
        r.id === rejectModal.id ? { ...r, status: 'REJECTED', rejectedAt: new Date().toISOString(), rejectReason } : r
      ));
      showToast?.('Solicitud rechazada', 'success');
      setRejectModal(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast?.('Error al rechazar solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  // MEJORA 15: Edit request
  const handleEditClick = (req) => {
    setEditModal(req);
    setEditForm({
      amount: req.amount?.toString() || '',
      rate: req.rate?.toString() || '',
      term: req.term?.toString() || '',
      frequency: req.frequency || 'Mensual',
      startDate: req.startDate ? req.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      amortizationType: req.amortizationType || 'FLAT',
      notes: req.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    try {
      setSaving(true);
      // Update via API if available, else local only
      const updated = {
        ...editModal,
        amount: parseFloat(editForm.amount),
        rate: parseFloat(editForm.rate),
        term: parseInt(editForm.term),
        frequency: editForm.frequency,
        startDate: editForm.startDate,
        amortizationType: editForm.amortizationType,
        notes: editForm.notes
      };
      setRequests(prev => prev.map(r => r.id === editModal.id ? updated : r));
      showToast?.('Solicitud actualizada', 'success');
      setEditModal(null);
    } catch (error) {
      console.error('Error updating request:', error);
      showToast?.('Error al actualizar solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const map = {
      REVIEW: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'En Revisión' },
      APPROVED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Aprobada' },
      REJECTED: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Rechazada' }
    };
    const style = map[status] || map.REVIEW;
    return <span className={`text-xs ${style.bg} ${style.text} px-2 py-0.5 rounded-full font-semibold`}>{style.label}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <FileText className="text-teal-500" size={28} />
          Solicitudes de Crédito
        </h2>
        <button
          onClick={() => document.getElementById('reqForm').scrollIntoView()}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-500 transition-colors"
        >
          <PlusCircle size={18} />
          Nueva Solicitud
        </button>
      </div>

      {/* MEJORA 2: Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'REVIEW', label: 'Pendientes', icon: Clock, color: 'amber' },
          { key: 'APPROVED', label: 'Aprobadas', icon: CheckCircle, color: 'emerald' },
          { key: 'REJECTED', label: 'Rechazadas', icon: XCircle, color: 'rose' },
          { key: 'ALL', label: 'Todas', icon: Filter, color: 'slate' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === tab.key
                ? `bg-${tab.color}-600 text-white shadow-lg`
                : `bg-${tab.color}-100 dark:bg-${tab.color}-900/20 text-${tab.color}-700 dark:text-${tab.color}-300 hover:bg-${tab.color}-200`
              }`}
          >
            <tab.icon size={16} />
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Cargando solicitudes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MEJORA 3: Request list with history */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-600 dark:text-slate-400 uppercase text-sm tracking-wider">
              {activeTab === 'ALL' ? 'Todas las Solicitudes' : activeTab === 'REVIEW' ? 'Pendientes de Revisión' : activeTab === 'APPROVED' ? 'Solicitudes Aprobadas' : 'Solicitudes Rechazadas'} ({filteredRequests.length})
            </h3>
            {filteredRequests.map(req => {
              const client = clients.find(c => c.id === req.clientId) || req.client;
              return (
                <Card key={req.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-indigo-200 dark:border-indigo-500/30">
                      {client?.photoUrl ? (
                        <img src={client.photoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{client?.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{client?.name}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      {/* MEJORA 5: Created date */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {req.createdAt ? formatDate(req.createdAt) : 'Sin fecha'}
                        {req.approvedAt && <span className="text-emerald-600"> · Aprobada {formatDate(req.approvedAt)}</span>}
                        {req.rejectedAt && <span className="text-rose-600"> · Rechazada {formatDate(req.rejectedAt)}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 grid grid-cols-2 gap-2 mb-3 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    <div>
                      Monto: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(req.amount)}</span>
                    </div>
                    <div>Tasa: <span className="font-semibold">{req.rate}%</span></div>
                    <div>
                      Plazo: <span className="font-semibold">{req.term} {req.frequency}</span>
                    </div>
                    <div>
                      Cuota: <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency((parseFloat(req.amount) * (1 + parseFloat(req.rate) / 100)) / parseInt(req.term || 1))}
                      </span>
                    </div>
                    {/* MEJORA 8: Show amortization type */}
                    {req.amortizationType && (
                      <div className="col-span-2 text-xs">
                        Tipo: <span className="font-semibold">{req.amortizationType === 'FLAT' ? 'Saldo Absoluto' : 'Saldo Insoluto'}</span>
                      </div>
                    )}
                  </div>
                  {/* MEJORA 9: Show notes */}
                  {req.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                      <StickyNote size={12} className="mt-0.5" />
                      <span>{req.notes}</span>
                    </div>
                  )}
                  {/* MEJORA 4: Show reject reason */}
                  {req.status === 'REJECTED' && req.rejectReason && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 mb-3 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                      <strong>Motivo:</strong> {req.rejectReason}
                    </div>
                  )}
                  {/* Action buttons only for REVIEW status */}
                  {req.status === 'REVIEW' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClick(req)}
                        disabled={saving}
                        className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-teal-500 transition-all disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectClick(req)}
                        disabled={saving}
                        className="flex-1 bg-rose-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-rose-500 transition-all disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      {/* MEJORA 15: Edit button */}
                      <button
                        onClick={() => handleEditClick(req)}
                        disabled={saving}
                        className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
            {filteredRequests.length === 0 && (
              <div className="text-center py-8 glass rounded-xl border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-400 dark:text-slate-500 text-sm">No hay solicitudes en esta categoría</p>
              </div>
            )}
          </div>

          <div id="reqForm">
            <Card>
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Crear Nueva Solicitud</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (form.clientId) addRequest(form);
              }} className="space-y-4">
                <div className="flex gap-2">
                  <select
                    required
                    className="flex-1 p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
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
                    type="button"
                    onClick={() => onNewClient?.((newClientId) => {
                      setForm({ ...form, clientId: newClientId });
                    })}
                    className="bg-blue-600/20 text-blue-400 border border-blue-500/30 p-2 rounded-lg hover:bg-blue-600/30 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <input
                      required
                      min="1"
                      type="number"
                      placeholder="Monto"
                      className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                    />
                    {form.amount && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(form.amount)}
                      </span>
                    )}
                  </div>
                  <input
                    required
                    min="0"
                    step="0.1"
                    type="number"
                    placeholder="Tasa %"
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={form.rate}
                    onChange={e => setForm({ ...form, rate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    min="1"
                    type="number"
                    placeholder="Plazo"
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  />
                  <select
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>

                {/* MEJORA 8: Amortization type selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Amortización</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={form.amortizationType}
                    onChange={e => setForm({ ...form, amortizationType: e.target.value })}
                  >
                    <option value="FLAT">Saldo Absoluto (Interés Simple)</option>
                    <option value="FRENCH">Saldo Insoluto (Interés Compuesto)</option>
                  </select>
                </div>

                {/* MEJORA 9: Notes field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas Internas</label>
                  <textarea
                    placeholder="Observaciones del analista..."
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[60px]"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* Cuota estimada preview */}
                {form.amount && form.rate && form.term && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">Cuota Estimada</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency((parseFloat(form.amount) * (1 + parseFloat(form.rate) / 100)) / parseInt(form.term))} / {form.frequency}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Solicitud'}
                </button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Gastos de Cierre con MEJORA 6: Notify client */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 text-white text-center relative">
              <button
                onClick={() => setApprovalModal(null)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold">Aprobar Solicitud</h3>
              <p className="text-sm text-white/80">{clients.find(c => c.id === approvalModal.clientId)?.name || approvalModal.client?.name}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">Monto del préstamo</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(approvalModal.amount)}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Gastos de Cierre (opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingCostsInput}
                  onChange={(e) => setClosingCostsInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-lg font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Se sumará al capital para el cálculo de cuotas</p>
              </div>

              {parseFloat(closingCostsInput) > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3 text-center">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Total a financiar: <strong>{formatCurrency(parseFloat(approvalModal.amount) + parseFloat(closingCostsInput))}</strong>
                  </p>
                </div>
              )}

              {/* MEJORA 6: Notify client checkbox */}
              <label className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer border border-green-200 dark:border-green-700">
                <input
                  type="checkbox"
                  checked={notifyClient}
                  onChange={(e) => setNotifyClient(e.target.checked)}
                  className="w-5 h-5 rounded text-green-600"
                />
                <div className="flex items-center gap-2">
                  <WhatsAppIcon size={18} />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">Notificar al cliente por WhatsApp</span>
                </div>
              </label>
            </div>

            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={() => setApprovalModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {notifyClient && <Send size={14} />}
                {saving ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 4: Reject Modal with reason */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 p-4 text-white text-center relative">
              <button
                onClick={() => setRejectModal(null)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold">Rechazar Solicitud</h3>
              <p className="text-sm text-white/80">{clients.find(c => c.id === rejectModal.clientId)?.name || rejectModal.client?.name}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">Monto solicitado</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(rejectModal.amount)}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Motivo del rechazo
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explica el motivo del rechazo..."
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[80px]"
                />
              </div>
            </div>

            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? 'Procesando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 15: Edit Request Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white text-center relative">
              <button
                onClick={() => setEditModal(null)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold">Editar Solicitud</h3>
              <p className="text-sm text-white/80">{clients.find(c => c.id === editModal.clientId)?.name}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Monto</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tasa %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Plazo</label>
                  <input
                    type="number"
                    value={editForm.term}
                    onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Frecuencia</label>
                  <select
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo de Amortización</label>
                <select
                  value={editForm.amortizationType}
                  onChange={(e) => setEditForm({ ...editForm, amortizationType: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                >
                  <option value="FLAT">Saldo Absoluto</option>
                  <option value="FRENCH">Saldo Insoluto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[60px]"
                />
              </div>
            </div>

            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestsView;
