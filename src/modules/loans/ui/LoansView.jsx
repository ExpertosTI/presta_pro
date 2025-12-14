import React, { useMemo, useState } from 'react';
import Card from '../../../shared/components/ui/Card.jsx';
import Badge from '../../../shared/components/ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { calculateSchedule } from '../../../shared/utils/amortization';
import { FileText, Sparkles, X, Printer, FileCheck, Plus, Banknote, Archive, Trash2, XCircle } from 'lucide-react';
import { PaymentConfirmationModal } from '../../payments';
import { printHtmlContent } from '../../../shared/utils/printUtils';
import PaymentTicket from '../../../shared/components/ui/PaymentTicket';
import { loanApi } from '../infrastructure/loanApi';

export function LoansView({ loans, clients, registerPayment, selectedLoanId, onSelectLoan, onUpdateLoan, addClientDocument, onCreateLoan, onNewClient, onNavigateToDocuments }) {
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractContent, setContractContent] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', rate: '', term: '', frequency: 'Mensual', startDate: '' });
  const [editError, setEditError] = useState('');

  // Create Loan Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ clientId: '', amount: '', rate: '20', term: '12', frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0], closingCosts: '', amortizationType: 'FLAT' });
  const [createError, setCreateError] = useState('');

  // Reprint Receipt
  const [reprintReceipt, setReprintReceipt] = useState(null);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Loan action modals
  const [cancelModal, setCancelModal] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      // Status filter
      if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;

      // Search query (client name)
      if (searchQuery.trim()) {
        const client = clients.find(c => c.id === loan.clientId);
        const clientName = (client?.name || '').toLowerCase();
        if (!clientName.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [loans, clients, searchQuery, statusFilter]);

  const selectedLoan = useMemo(() => loans.find(l => l.id === selectedLoanId), [loans, selectedLoanId]);
  const selectedClient = useMemo(() => {
    if (!selectedLoan) return null;
    return clients.find(c => c.id === selectedLoan.clientId);
  }, [selectedLoan, clients]);

  const firstPendingInstallment = useMemo(() => {
    if (!selectedLoan || !selectedLoan.schedule) return null;
    return selectedLoan.schedule.find(s => s.status !== 'PAID');
  }, [selectedLoan]);

  const handleOpenEditLoan = () => {
    if (!selectedLoan || !onUpdateLoan) return;
    const hasPayments = Array.isArray(selectedLoan.schedule)
      ? selectedLoan.schedule.some(i => i.status === 'PAID')
      : false;
    if (hasPayments) return; // no permitir edición si ya tiene pagos

    setEditForm({
      amount: String(selectedLoan.amount || ''),
      rate: String(selectedLoan.rate || ''),
      term: String(selectedLoan.term || ''),
      frequency: selectedLoan.frequency || 'Mensual',
      startDate: selectedLoan.startDate || new Date().toISOString().split('T')[0],
      amortizationType: selectedLoan.amortizationType || 'FLAT'
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSubmitEditLoan = (e) => {
    e.preventDefault();
    if (!selectedLoan || !onUpdateLoan) return;

    const amount = parseFloat(editForm.amount || '0');
    const rate = parseFloat(editForm.rate || '0');
    const term = parseInt(editForm.term || '0', 10);

    if (!amount || !rate || !term) {
      setEditError('Completa monto, tasa y plazo con valores válidos.');
      return;
    }

    try {
      const schedule = calculateSchedule(
        amount,
        rate,
        term,
        editForm.frequency,
        editForm.startDate || selectedLoan.startDate,
        editForm.amortizationType || 'FLAT'
      );

      const updatedLoan = {
        ...selectedLoan,
        amount,
        rate,
        term,
        frequency: editForm.frequency,
        amortizationType: editForm.amortizationType,
        startDate: editForm.startDate || selectedLoan.startDate,
        schedule,
        totalInterest: schedule.reduce((acc, item) => acc + item.interest, 0),
        totalPaid: 0,
        status: 'ACTIVE',
      };

      onUpdateLoan(updatedLoan);
      setEditModalOpen(false);
    } catch (err) {
      console.error(err);
      setEditError('No se pudo recalcular la hoja de amortización. Revisa los datos.');
    }
  };

  const handleGenerateContract = async () => {
    if (!selectedLoan || !selectedClient) return;
    setGeneratingContract(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      // Dynamic import to avoid circular dependency issues if any, though direct import is fine here
      const { generateLoanContract } = await import('../../../services/aiService');
      const contract = await generateLoanContract(selectedLoan, selectedClient, "Presta Pro", apiKey);
      setContractContent(contract);
      setShowContractModal(true);
    } catch (error) {
      console.error('Error generating loan contract with AI', error);
      const message = error?.message || '';

      if (message === 'API Key missing' || message === 'INVALID_API_KEY') {
        alert('Falta configurar correctamente la API de IA (VITE_GEMINI_API_KEY) en este servidor.');
      } else if (message === 'RATE_LIMIT' || error?.status === 429) {
        alert('La IA de contratos alcanzó el límite de uso. Intenta de nuevo en unos minutos.');
      } else {
        alert('No se pudo generar el contrato en este momento. Intenta nuevamente más tarde.');
      }
    } finally {
      setGeneratingContract(false);
    }
  };

  const handlePrintContract = () => {
    if (!contractContent || !selectedClient) return;
    printHtmlContent(`Contrato - ${selectedClient.name}`, contractContent);
  };

  const handlePrintAmortization = () => {
    if (!selectedLoan || !selectedClient) return;

    const schedule = selectedLoan.schedule || [];
    const totalPayment = schedule.reduce((acc, s) => acc + (s.payment || 0), 0);

    // NOTA: No mostramos tasa, desglose de interés/capital - son datos sensibles internos
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
          <h1 style="margin: 0; color: #1e40af; font-size: 24px;">CALENDARIO DE PAGOS</h1>
          <p style="margin: 5px 0 0; color: #64748b; font-size: 12px;">Presta Pro by Renace.tech</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <div>
            <p style="margin: 0 0 5px; font-size: 14px;"><strong>Cliente:</strong> ${selectedClient.name}</p>
            <p style="margin: 0 0 5px; font-size: 14px;"><strong>Cédula/ID:</strong> ${selectedClient.idNumber || 'N/A'}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Teléfono:</strong> ${selectedClient.phone || 'N/A'}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0 0 5px; font-size: 14px;"><strong>Monto financiado:</strong> ${formatCurrency(selectedLoan.amount)}</p>
            <p style="margin: 0 0 5px; font-size: 14px;"><strong>Plazo:</strong> ${selectedLoan.term} cuotas</p>
            <p style="margin: 0 0 5px; font-size: 14px;"><strong>Frecuencia:</strong> ${selectedLoan.frequency}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Inicio:</strong> ${formatDate(selectedLoan.startDate)}</p>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">No.</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #1e3a8a;">Fecha de Pago</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #1e3a8a;">Monto a Pagar</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #1e3a8a;">Saldo Restante</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">Estado</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #1e3a8a;">Firma</th>
            </tr>
          </thead>
          <tbody>
            ${schedule.map((inst, idx) => `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">${inst.number}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${formatDate(inst.date)}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">${formatCurrency(inst.payment || 0)}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #e2e8f0;">${formatCurrency(inst.balance || 0)}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #e2e8f0;">
                  <span style="padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: ${inst.status === 'PAID' ? '#dcfce7' : '#fef3c7'}; color: ${inst.status === 'PAID' ? '#166534' : '#92400e'};">
                    ${inst.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                  </span>
                </td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; min-width: 60px;"></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #1e40af; color: white; font-weight: bold;">
              <td colspan="2" style="padding: 10px; border: 1px solid #1e3a8a;">TOTAL A PAGAR</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #1e3a8a;">${formatCurrency(totalPayment)}</td>
              <td colspan="3" style="padding: 10px; border: 1px solid #1e3a8a;"></td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
            <p style="margin: 0; font-size: 12px;">Firma del Cliente</p>
          </div>
          <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
            <p style="margin: 0; font-size: 12px;">Firma Empresa</p>
          </div>
        </div>
        
        <p style="margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8;">
          Generado el ${new Date().toLocaleString('es-DO')} • Presta Pro
        </p>
      </div>
    `;

    printHtmlContent(`Calendario de pagos - ${selectedClient.name}`, htmlContent);
  };

  const handleSaveContractToDocuments = () => {
    if (!contractContent || !selectedClient || !addClientDocument) return;
    addClientDocument(selectedClient.id, {
      type: 'CONTRACT',
      title: `Contrato de préstamo - ${selectedClient.name}`,
      content: contractContent,
    });
    alert('Contrato guardado en Documentos del cliente.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Payment Confirmation Modal - Extracted Component */}
      {paymentToConfirm && (
        <PaymentConfirmationModal
          paymentToConfirm={paymentToConfirm}
          onConfirm={async (loanId, installmentId, options) => {
            const receipt = await registerPayment(loanId, installmentId, options);
            if (receipt) {
              // Import and print thermal receipt
              const { printThermalReceipt } = await import('../../../services/thermalPrinter');
              printThermalReceipt(receipt, { companyName: 'Presta Pro' });
            }
            setPaymentToConfirm(null);
          }}
          onCancel={() => setPaymentToConfirm(null)}
        />
      )}

      {/* Edit Loan Modal (solo préstamos sin pagos) */}
      {editModalOpen && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Editar préstamo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Solo puedes editar préstamos que aún no tengan pagos registrados.
            </p>
            {editError && (
              <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}
            <form onSubmit={handleSubmitEditLoan} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Monto</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tasa %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Plazo</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={editForm.term}
                    onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditError('');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Loan Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Nuevo Préstamo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Crea un préstamo directo para un cliente existente.
            </p>
            {createError && (
              <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!onCreateLoan) return;
              const amount = parseFloat(createForm.amount || '0');
              const rate = parseFloat(createForm.rate || '0');
              const term = parseInt(createForm.term || '0', 10);
              if (!createForm.clientId || !amount || !rate || !term) {
                setCreateError('Completa todos los campos correctamente.');
                return;
              }
              const closingCosts = parseFloat(createForm.closingCosts || '0');
              onCreateLoan({
                clientId: createForm.clientId,
                amount,
                rate,
                term,
                frequency: createForm.frequency,
                startDate: createForm.startDate,
                closingCosts,
                amortizationType: createForm.amortizationType
              });
              setCreateModalOpen(false);
              setCreateForm({ clientId: '', amount: '', rate: '20', term: '12', frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0], closingCosts: '' });
              setCreateError('');
            }} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cliente</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.clientId}
                    onChange={(e) => setCreateForm({ ...createForm, clientId: e.target.value })}
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {onNewClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalOpen(false);
                        onNewClient();
                      }}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      + Nuevo
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Monto</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tasa %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.rate}
                    onChange={(e) => setCreateForm({ ...createForm, rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Plazo (cuotas)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.term}
                    onChange={(e) => setCreateForm({ ...createForm, term: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.frequency}
                    onChange={(e) => setCreateForm({ ...createForm, frequency: e.target.value })}
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Gastos de Cierre <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={createForm.closingCosts}
                  onChange={(e) => setCreateForm({ ...createForm, closingCosts: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1">Se suma al capital para calcular las cuotas</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tipo de Interés
                </label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={createForm.amortizationType}
                  onChange={(e) => setCreateForm({ ...createForm, amortizationType: e.target.value })}
                >
                  <option value="FLAT">Saldo Absoluto (Interés Simple)</option>
                  <option value="FRENCH">Saldo Insoluto (Interés Compuesto)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {createForm.amortizationType === 'FLAT'
                    ? 'Ej: 10,000 al 20% = 12,000 total (común en financieras)'
                    : 'Interés calculado sobre saldo restante (bancos)'}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => { setCreateModalOpen(false); setCreateError(''); }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  Crear Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-blue-600" />
          Préstamos y Cobros
        </h2>
        {onCreateLoan && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Nuevo Préstamo
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="COMPLETED">Completados</option>
          <option value="DEFAULTED">En mora</option>
        </select>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filteredLoans.length} de {loans.length}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left hidden md:table-cell">Tasa</th>
                <th className="p-2 text-left hidden sm:table-cell">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLoans.map(l => {
                const client = clients.find(c => c.id === l.clientId);
                const isSelected = selectedLoanId === l.id;
                // Check if client has documents (simulated or real property check)
                const hasDocuments = client?.documents && client.documents.length > 0;

                return (
                  <tr
                    key={l.id}
                    onClick={() => onSelectLoan && onSelectLoan(l.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <td className="p-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {client?.name || 'Sin cliente'}
                      {hasDocuments && (
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1" title={`${client.documents.length} documentos`}>
                          <FileText size={10} /> {client.documents.length}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-slate-800 dark:text-slate-200 font-medium">{formatCurrency(l.amount)}</td>
                    <td className="p-2 text-slate-600 dark:text-slate-400 hidden md:table-cell">{l.rate}%</td>
                    <td className="p-2 hidden sm:table-cell"><Badge status={l.status} /></td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-400" colSpan={4}>
                    No hay préstamos registrados.
                  </td>
                </tr>
              )}

              {/* Payment Modal removed - served by PaymentConfirmationModal content above */}
            </tbody>
          </table>
        </div>
      </Card >

      {selectedLoan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment section - moved to top on mobile, left column on desktop */}
          <Card className="lg:col-span-1 order-1 lg:order-1">
            <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Detalle del Préstamo</h3>
            {selectedClient && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Cliente: </span>{selectedClient.name}
                </p>
                {onNavigateToDocuments && (
                  <button
                    onClick={() => onNavigateToDocuments(selectedClient.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                    title="Ver documentos del cliente"
                  >
                    <FileText size={14} />
                    Documentos
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
              <span className="font-semibold">Monto: </span>{formatCurrency(selectedLoan.amount)}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
              <span className="font-semibold">Tasa: </span>{selectedLoan.rate}%
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
              <span className="font-semibold">Estado: </span>
              <Badge status={selectedLoan.status} />
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
              <span className="font-semibold">Total Pagado: </span>{formatCurrency(selectedLoan.totalPaid || 0)}
            </p>

            {firstPendingInstallment && (
              <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800/50 rounded-xl text-sm shadow-sm">
                <p className="font-bold text-green-800 dark:text-green-300 mb-2 text-base">💳 Próxima cuota pendiente</p>
                <p className="text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold">Cuota #{firstPendingInstallment.number}</span> • {formatDate(firstPendingInstallment.date)}
                </p>
                <p className="text-slate-700 dark:text-slate-300 mb-3">
                  <span className="font-semibold">Monto: </span>{formatCurrency(firstPendingInstallment.payment)}
                </p>
                <button
                  onClick={() => {
                    setPenaltyAmountInput('');
                    setPaymentToConfirm({
                      loanId: selectedLoan.id,
                      installmentId: firstPendingInstallment.id,
                      amount: firstPendingInstallment.payment,
                      number: firstPendingInstallment.number,
                      date: firstPendingInstallment.date,
                      clientName: selectedClient?.name || 'Sin cliente',
                    });
                  }}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                >
                  ✓ Registrar Pago de esta Cuota
                </button>
              </div>
            )}

            {Array.isArray(selectedLoan.schedule) && selectedLoan.schedule.some(i => i.status === 'PAID') ? (
              <p className="mt-4 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                Este préstamo ya tiene pagos registrados y no se puede editar.
              </p>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleOpenEditLoan}
                  className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                  Editar préstamo
                </button>
              </div>
            )}

            <div className="mt-3">
              <button
                onClick={handleGenerateContract}
                disabled={generatingContract}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {generatingContract ? 'Generando...' : 'Generar Contrato Legal (IA)'}
              </button>
            </div>

            {/* Loan Actions: Cancel, Archive, Delete */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-2 font-medium">Acciones del préstamo</p>
              <div className="grid grid-cols-3 gap-2">
                {selectedLoan.status === 'ACTIVE' && (
                  <button
                    onClick={() => setCancelModal(true)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-xs"
                  >
                    <XCircle size={18} />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => setArchiveModal(true)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs"
                >
                  <Archive size={18} />
                  {selectedLoan.archived ? 'Desarchivar' : 'Archivar'}
                </button>
                {!Array.isArray(selectedLoan.schedule) || !selectedLoan.schedule.some(i => i.status === 'PAID') ? (
                  <button
                    onClick={() => setDeleteModal(true)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs"
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 order-2 lg:order-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Hoja de amortización</h3>
              <button
                onClick={handlePrintAmortization}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                title="Imprimir hoja de amortización"
              >
                <Printer size={16} />
                Imprimir
              </button>
            </div>
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-right">Cuota</th>
                    <th className="p-2 text-right">Interés</th>
                    <th className="p-2 text-right">Capital</th>
                    <th className="p-2 text-right">Saldo</th>
                    <th className="p-2 text-right">Estado</th>
                    <th className="p-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {selectedLoan.schedule.map(inst => (
                    <tr key={inst.id}>
                      <td className="p-2 text-slate-800 dark:text-slate-300">{inst.number}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{formatDate(inst.date)}</td>
                      <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(inst.payment)}</td>
                      <td className="p-2 text-right text-red-500 dark:text-red-400">{formatCurrency(inst.interest ?? 0)}</td>
                      <td className="p-2 text-right text-green-600 dark:text-green-400">{formatCurrency(inst.principal ?? 0)}</td>
                      <td className="p-2 text-right text-slate-500 dark:text-slate-400">{formatCurrency(inst.balance ?? 0)}</td>
                      <td className="p-2 text-right">
                        <Badge status={inst.status === 'PAID' ? 'PAID' : 'PENDING'} />
                      </td>
                      <td className="p-2 text-center">
                        {inst.status === 'PAID' && (
                          <button
                            onClick={() => setReprintReceipt({
                              id: inst.id || `inst-${inst.number}`,
                              date: inst.paidAt || inst.date,
                              clientName: selectedClient?.name || 'Cliente',
                              amount: inst.payment,
                              installmentNumber: inst.number,
                              remainingBalance: inst.balance,
                              loanId: selectedLoan.id,
                              penalty: 0,
                              total: inst.payment
                            })}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 mx-auto"
                            title="Reimprimir recibo"
                          >
                            <Printer size={14} /> Copia
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )
      }

      {/* Reprint Receipt Modal */}
      {reprintReceipt && (
        <PaymentTicket
          receipt={reprintReceipt}
          onClose={() => setReprintReceipt(null)}
          isCopy={true}
        />
      )}

      {/* Cancel Loan Modal */}
      {cancelModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
              <XCircle size={20} /> Cancelar Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              ¿Estás seguro de cancelar este préstamo? Solo se puede cancelar si no tiene pagos registrados.
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Razón de cancelación (opcional)"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelModal(false); setCancelReason(''); }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                No, volver
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await loanApi.cancel(selectedLoan.id, cancelReason || 'Cancelado por usuario');
                    setCancelModal(false);
                    setCancelReason('');
                    // Reload to sync with server
                    window.location.reload();
                  } catch (e) {
                    alert(e.message || 'Error al cancelar');
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {actionLoading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Loan Modal */}
      {archiveModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Archive size={20} /> {selectedLoan.archived ? 'Desarchivar' : 'Archivar'} Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {selectedLoan.archived
                ? 'Este préstamo volverá a aparecer en la lista principal.'
                : 'El préstamo se ocultará de la vista principal pero no se eliminará.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveModal(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    if (selectedLoan.archived) {
                      await loanApi.unarchive(selectedLoan.id);
                    } else {
                      await loanApi.archive(selectedLoan.id);
                    }
                    setArchiveModal(false);
                    // Reload to sync with server
                    window.location.reload();
                  } catch (e) {
                    alert(e.message || 'Error');
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-700"
              >
                {actionLoading ? 'Procesando...' : (selectedLoan.archived ? 'Desarchivar' : 'Archivar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Loan Modal */}
      {deleteModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <Trash2 size={20} /> Eliminar Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              ⚠️ <strong>Esta acción es irreversible.</strong>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Se eliminará permanentemente el préstamo y todos sus datos asociados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                No, volver
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await loanApi.delete(selectedLoan.id);
                    onSelectLoan?.(null);
                    // Force reload by calling parent update
                    window.location.reload();
                  } catch (e) {
                    alert(e.message || 'Error al eliminar');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                {actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoansView;
