import React, { useState, useEffect } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency } from '../../../shared/utils/formatters';
import { X, FileText, PlusCircle } from 'lucide-react';
import loanRequestService from '../services/loanRequestService';

export function RequestsView({ clients, showToast, onNewClient, onCreateLoan }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    rate: '',
    term: '',
    frequency: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Modal para gastos de cierre
  const [approvalModal, setApprovalModal] = useState(null);
  const [closingCostsInput, setClosingCostsInput] = useState('0');

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

  const addRequest = async (formData) => {
    try {
      setSaving(true);
      const newRequest = await loanRequestService.createLoanRequest({
        clientId: formData.clientId,
        amount: parseFloat(formData.amount),
        rate: parseFloat(formData.rate),
        term: parseInt(formData.term),
        frequency: formData.frequency,
        startDate: formData.startDate
      });
      setRequests(prev => [newRequest, ...prev]);
      setForm({
        clientId: '',
        amount: '',
        rate: '',
        term: '',
        frequency: 'Mensual',
        startDate: new Date().toISOString().split('T')[0],
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
        onCreateLoan({
          clientId: approvalModal.clientId,
          clientName: client?.name,
          capital: parseFloat(approvalModal.amount) + closingCosts,
          originalCapital: parseFloat(approvalModal.amount),
          closingCosts: closingCosts,
          rate: parseFloat(approvalModal.rate),
          term: parseInt(approvalModal.term),
          frequency: approvalModal.frequency,
          startDate: approvalModal.startDate || new Date().toISOString()
        });
      }

      // Update local state
      setRequests(prev => prev.map(r =>
        r.id === approvalModal.id ? { ...r, status: 'APPROVED' } : r
      ));

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

  const rejectRequest = async (req) => {
    try {
      setSaving(true);
      await loanRequestService.rejectLoanRequest(req.id);
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: 'REJECTED' } : r
      ));
      showToast?.('Solicitud rechazada', 'success');
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast?.('Error al rechazar solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'REVIEW');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <FileText className="text-teal-500" size={28} />
          Solicitudes de Crédito
        </h2>
        <button
          onClick={() => document.getElementById('reqForm').scrollIntoView()}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusCircle size={18} />
          Nueva Solicitud
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Cargando solicitudes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-amber-600 dark:text-amber-400 uppercase text-sm tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              En Revisión ({pendingRequests.length})
            </h3>
            {pendingRequests.map(req => {
              const client = clients.find(c => c.id === req.clientId) || req.client;
              return (
                <Card key={req.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-indigo-200 dark:border-indigo-500/30">
                      {client?.photoUrl ? (
                        <img src={client.photoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{client?.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{client?.name}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-500/30 px-2 py-0.5 rounded">Revisión</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Solicitud #{req?.id?.slice(0, 4) || ''}</p>
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveClick(req)}
                      disabled={saving}
                      className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-900/20 transition-all disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => rejectRequest(req)}
                      disabled={saving}
                      className="flex-1 bg-rose-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-rose-500 transition-all disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </Card>
              );
            })}
            {pendingRequests.length === 0 && (
              <div className="text-center py-8 glass rounded-xl border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-400 dark:text-slate-500 text-sm">No hay solicitudes pendientes</p>
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
                    className="flex-1 p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
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
                      className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
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
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
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
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                    value={form.term}
                    onChange={e => setForm({ ...form, term: e.target.value })}
                  />
                  <select
                    className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
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

      {/* Modal de Gastos de Cierre */}
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
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-lg font-mono"
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
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? 'Procesando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestsView;
