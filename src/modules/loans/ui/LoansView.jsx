import React, { useMemo, useState } from 'react';
import Card from '../../../shared/components/ui/Card.jsx';
import Badge from '../../../shared/components/ui/Badge.jsx';
import MoneyInput from '../../../shared/components/ui/MoneyInput.jsx';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { calculateSchedule, calculateInstallmentVal, calculateRateFromInstallment } from '../../../shared/utils/amortization';
import {
  calculatePeriodInterest,
  calculateTotalPendingInterest,
  getPeriodRatePercent,
  getRetrospectiveLoanSummary,
  getOpenLoanSummary,
  OPEN_LOAN_FREQUENCIES,
  previewRetrospectiveLoan
} from '../../../shared/utils/openLoanInterest';
import { isFutureDate, parseDateOnly, toDateInputValue } from '../../../shared/utils/dateUtils';
import {
  FileText, Sparkles, X, Printer, FileCheck, Plus, Banknote, Archive, Trash2, XCircle,
  ArrowUpDown, Filter, Calendar, TrendingUp, RefreshCw, Wallet, Clock, History,
  StickyNote, UserCheck, ChevronRight, Percent, AlertTriangle, LayoutList, Receipt
} from 'lucide-react';
import { PaymentConfirmationModal } from '../../payments';
import { printHtmlContent } from '../../../shared/utils/printUtils';
import PaymentTicket from '../../../shared/components/ui/PaymentTicket';
import DigitalReceipt from '../../../components/DigitalReceipt';
import { loanApi } from '../infrastructure/loanApi';

export function LoansView({ loans, clients, collectors = [], registerPayment, selectedLoanId, onSelectLoan, onUpdateLoan, addClientDocument, onCreateLoan, onNewClient, onNavigateToDocuments, systemSettings = {} }) {
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
  const [createForm, setCreateForm] = useState({ clientId: '', loanType: 'FIXED', amount: '', rate: '20', dailyRate: '', term: '12', openTerm: '60', frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0], closingCosts: '', amortizationType: 'FLAT', installment: '' });
  const [createError, setCreateError] = useState('');
  const [freePaymentAmount, setFreePaymentAmount] = useState('');
  const [freePaymentNotes, setFreePaymentNotes] = useState('');
  const [freePaymentInterestOnly, setFreePaymentInterestOnly] = useState(true);
  const [detailTab, setDetailTab] = useState('overview');
  const [freePaymentDate, setFreePaymentDate] = useState(toDateInputValue(new Date()));

  const handleCreateFormChange = (fields) => {
    setCreateForm(prev => {
      let updated = { ...prev, ...fields };
      if (updated.loanType === 'OPEN') {
        return updated;
      }
      const totalAmount = (parseFloat(updated.amount) || 0) + (parseFloat(updated.closingCosts) || 0);
      if (fields.hasOwnProperty('installment')) {
        const rateVal = calculateRateFromInstallment(totalAmount, fields.installment, updated.term, updated.frequency, updated.amortizationType);
        updated.rate = rateVal;
      } else {
        const instVal = calculateInstallmentVal(totalAmount, updated.rate, updated.term, updated.frequency, updated.amortizationType);
        updated.installment = instVal;
      }
      return updated;
    });
  };


  // Receipt display after payment
  const [receiptToShow, setReceiptToShow] = useState(null);

  // Reprint Receipt
  const [reprintReceipt, setReprintReceipt] = useState(null);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  // MEJORA 1: Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  // MEJORA 3: Type filter (FIXED vs OPEN)
  const [typeFilter, setTypeFilter] = useState('ALL');
  // MEJORA 6: Collector filter
  const [collectorFilter, setCollectorFilter] = useState('ALL');
  // MEJORA 8: Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // MEJORA 14: Notes modal
  const [notesModal, setNotesModal] = useState({ show: false, loanId: null, notes: '' });
  // MEJORA 11 & 12: Renew/Refinance modals
  const [renewModal, setRenewModal] = useState(false);
  const [refinanceModal, setRefinanceModal] = useState(false);

  // Loan action modals
  const [cancelModal, setCancelModal] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });

  const filteredLoans = useMemo(() => {
    let result = loans.filter(loan => {
      // Archive filter - hide archived unless showArchived is true
      if (!showArchived && loan.archived) return false;

      // Status filter
      if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;

      // MEJORA 3: Type filter
      if (typeFilter !== 'ALL') {
        const isOpen = loan.loanType === 'OPEN' || loan.amortizationType === 'OPEN' || loan.type === 'OPEN';
        if (typeFilter === 'OPEN' && !isOpen) return false;
        if (typeFilter === 'FIXED' && isOpen) return false;
      }

      // MEJORA 6: Collector filter
      if (collectorFilter !== 'ALL') {
        const client = clients.find(c => c.id === loan.clientId);
        if (client?.collectorId !== collectorFilter) return false;
      }

      // MEJORA 8: Date filter
      if (dateFrom) {
        const loanDate = new Date(loan.startDate || loan.createdAt);
        if (loanDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const loanDate = new Date(loan.startDate || loan.createdAt);
        if (loanDate > new Date(dateTo)) return false;
      }

      // Search query (client name)
      if (searchQuery.trim()) {
        const client = clients.find(c => c.id === loan.clientId);
        const clientName = (client?.name || '').toLowerCase();
        if (!clientName.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });

    // MEJORA 1: Sorting
    result.sort((a, b) => {
      let valA, valB;
      const clientA = clients.find(c => c.id === a.clientId);
      const clientB = clients.find(c => c.id === b.clientId);

      if (sortBy === 'date') {
        valA = new Date(a.startDate || a.createdAt);
        valB = new Date(b.startDate || b.createdAt);
      } else if (sortBy === 'amount') {
        valA = parseFloat(a.amount) || 0;
        valB = parseFloat(b.amount) || 0;
      } else if (sortBy === 'client') {
        valA = (clientA?.name || '').toLowerCase();
        valB = (clientB?.name || '').toLowerCase();
      } else if (sortBy === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [loans, clients, searchQuery, statusFilter, showArchived, typeFilter, collectorFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const selectedLoan = useMemo(() => loans.find(l => l.id === selectedLoanId), [loans, selectedLoanId]);
  const isSelectedLoanOpen = selectedLoan?.loanType === 'OPEN' || selectedLoan?.amortizationType === 'OPEN' || selectedLoan?.type === 'OPEN';
  const selectedClient = useMemo(() => {
    if (!selectedLoan) return null;
    return clients.find(c => c.id === selectedLoan.clientId);
  }, [selectedLoan, clients]);

  const firstPendingInstallment = useMemo(() => {
    if (!selectedLoan || !selectedLoan.schedule) return null;
    return selectedLoan.schedule.find(s => s.status !== 'PAID');
  }, [selectedLoan]);

  const fixedRemainingInterest = useMemo(() => {
    if (!selectedLoan || isSelectedLoanOpen || !Array.isArray(selectedLoan.schedule)) return 0;
    return selectedLoan.schedule
      .filter(s => s.status !== 'PAID')
      .reduce((sum, s) => sum + (parseFloat(s.interest || 0)), 0);
  }, [selectedLoan, isSelectedLoanOpen]);

  const openLoanSummary = useMemo(() => {
    if (!selectedLoan || !isSelectedLoanOpen) return null;
    return getOpenLoanSummary(
      selectedLoan,
      new Date(),
      systemSettings?.defaultPenaltyRate ?? 5
    );
  }, [selectedLoan, isSelectedLoanOpen, systemSettings?.defaultPenaltyRate]);

  const openLoanPendingInterest = useMemo(() => {
    if (!selectedLoan || !isSelectedLoanOpen) return 0;
    return openLoanSummary?.totalPending ?? selectedLoan.pendingInterest ?? calculateTotalPendingInterest(selectedLoan);
  }, [selectedLoan, isSelectedLoanOpen, openLoanSummary]);

  const selectedLoanRetrospective = useMemo(() => {
    if (!selectedLoan) return null;
    return getRetrospectiveLoanSummary(selectedLoan);
  }, [selectedLoan]);

  const createRetrospectivePreview = useMemo(() => {
    return previewRetrospectiveLoan(createForm);
  }, [createForm]);

  const openLoanPeriodInterest = useMemo(() => {
    if (!selectedLoan || !isSelectedLoanOpen) return 0;
    return selectedLoan.periodInterestEstimate
      ?? calculatePeriodInterest(
        selectedLoan.currentBalance || selectedLoan.amount || 0,
        selectedLoan.rate,
        selectedLoan.frequency || 'Mensual',
        selectedLoan.dailyRate
      );
  }, [selectedLoan, isSelectedLoanOpen]);

  // MEJORA 4: Portfolio statistics
  const loanStats = useMemo(() => {
    const activeLoans = loans.filter(l => !l.archived && l.status === 'ACTIVE');
    const totalPortfolio = activeLoans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalExpectedInterest = activeLoans.reduce((acc, l) => acc + (l.totalInterest || 0), 0);
    const totalCollected = activeLoans.reduce((acc, l) => acc + (l.totalPaid || 0), 0);
    const totalPending = (totalPortfolio + totalExpectedInterest) - totalCollected;

    // Count by type
    const fixedCount = activeLoans.filter(l => l.loanType !== 'OPEN' && l.amortizationType !== 'OPEN' && l.type !== 'OPEN').length;
    const openCount = activeLoans.filter(l => l.loanType === 'OPEN' || l.amortizationType === 'OPEN' || l.type === 'OPEN').length;

    return {
      totalPortfolio,
      totalExpectedInterest,
      totalCollected,
      totalPending,
      activeCount: activeLoans.length,
      fixedCount,
      openCount
    };
  }, [loans]);

  // MEJORA 9: Get payment progress for a loan
  const getPaymentProgress = (loan) => {
    if (!loan.schedule || loan.schedule.length === 0) return 0;
    const paid = loan.schedule.filter(s => s.status === 'PAID').length;
    return Math.round((paid / loan.schedule.length) * 100);
  };

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
      const { generateLoanContract } = await import('../../../services/aiService');
      const contract = await generateLoanContract(selectedLoan, selectedClient, "Presta Pro");
      setContractContent(contract);
      setShowContractModal(true);
    } catch (error) {
      console.error('Error generating loan contract with AI', error);
      const message = error?.message || '';

      if (error?.response?.status === 503) {
        alert('El Asistente IA no está configurado en el servidor.');
      } else if (message === 'RATE_LIMIT' || error?.status === 429 || error?.response?.status === 429) {
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
              setReceiptToShow(receipt);
            }
            setPaymentToConfirm(null);
          }}
          onCancel={() => setPaymentToConfirm(null)}
        />
      )}

      {/* Digital Receipt after payment */}
      {receiptToShow && (
        <DigitalReceipt
          receipt={receiptToShow}
          companyName={systemSettings?.companyName || "Presta Pro"}
          companyLogo={systemSettings?.companyLogo}
          systemSettings={systemSettings}
          onClose={() => setReceiptToShow(null)}
          onPrint={() => window.print()}
        />
      )}

      {/* Edit Loan Modal (solo préstamos sin pagos) */}
      {editModalOpen && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/70 flex justify-center items-start overflow-y-auto z-50 p-4 backdrop-blur-sm safe-area-insets">
          <div className="my-auto w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Monto</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[44px]"
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
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[44px]"
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[44px] active:scale-95 touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold min-h-[44px] active:scale-95 touch-manipulation"
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
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm safe-area-insets">
          <div className="w-full max-w-md max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-0.5">Nuevo Préstamo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Crea un préstamo directo para un cliente existente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setCreateModalOpen(false); setCreateError(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
                const isOpenLoan = createForm.loanType === 'OPEN';

                if (!createForm.clientId || !amount || !rate || (!isOpenLoan && !term)) {
                  setCreateError('Completa todos los campos correctamente.');
                  return;
                }
                if (isFutureDate(createForm.startDate)) {
                  setCreateError('La fecha de inicio no puede ser futura. Use una fecha pasada para préstamos retroactivos.');
                  return;
                }
                const closingCosts = parseFloat(createForm.closingCosts || '0');
                const openTerm = parseInt(createForm.openTerm || '60', 10);
                onCreateLoan({
                  clientId: createForm.clientId,
                  loanType: createForm.loanType,
                  amount,
                  rate,
                  term: isOpenLoan ? openTerm : term,
                  frequency: isOpenLoan ? createForm.frequency : createForm.frequency,
                  startDate: createForm.startDate,
                  closingCosts,
                  amortizationType: isOpenLoan ? undefined : createForm.amortizationType,
                  dailyRate: isOpenLoan && createForm.dailyRate ? parseFloat(createForm.dailyRate) : undefined
                });
                setCreateModalOpen(false);
                setCreateForm({ clientId: '', loanType: 'FIXED', amount: '', rate: '20', dailyRate: '', term: '12', openTerm: '60', frequency: 'Mensual', startDate: new Date().toISOString().split('T')[0], closingCosts: '', amortizationType: 'FLAT', installment: '' });
                setCreateError('');
              }} className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo de préstamo</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={createForm.loanType}
                    onChange={(e) => handleCreateFormChange({ loanType: e.target.value })}
                  >
                    <option value="FIXED">Cuotas fijas</option>
                    <option value="OPEN">Abierto (abonos libres)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cliente</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                      value={createForm.clientId}
                      onChange={(e) => handleCreateFormChange({ clientId: e.target.value })}
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
                          onNewClient((newClientId) => {
                            setCreateModalOpen(true);
                            handleCreateFormChange({ clientId: newClientId });
                          });
                        }}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                      >
                        + Nuevo
                      </button>
                    )}
                  </div>
                </div>

                <div className={`grid gap-3 ${createForm.loanType === 'OPEN' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Monto</label>
                    <MoneyInput
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                      value={createForm.amount}
                      onChange={(val) => handleCreateFormChange({ amount: val })}
                      placeholder="15,000"
                    />
                  </div>
                  {createForm.loanType !== 'OPEN' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Plazo (cuotas)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                        value={createForm.term}
                        onChange={(e) => handleCreateFormChange({ term: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {createForm.loanType !== 'OPEN' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                        <select
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                          value={createForm.frequency}
                          onChange={(e) => handleCreateFormChange({ frequency: e.target.value })}
                        >
                          <option>Diario</option>
                          <option>Semanal</option>
                          <option>Quincenal</option>
                          <option>Mensual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo de Interés</label>
                        <select
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                          value={createForm.amortizationType}
                          onChange={(e) => handleCreateFormChange({ amortizationType: e.target.value })}
                        >
                          <option value="FLAT">Saldo Absoluto (Interés Simple)</option>
                          <option value="FRENCH">Saldo Insoluto (Interés Compuesto)</option>
                          <option value="INTEREST_ONLY">Solo Interés (capital intacto)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Valor de la Cuota</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          className="w-full p-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 font-bold"
                          value={createForm.installment}
                          onChange={(e) => handleCreateFormChange({ installment: e.target.value })}
                          placeholder="Calcular..."
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
                          onChange={(e) => handleCreateFormChange({ rate: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frecuencia de rédito</label>
                        <select
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                          value={createForm.frequency}
                          onChange={(e) => handleCreateFormChange({ frequency: e.target.value })}
                        >
                          {OPEN_LOAN_FREQUENCIES.map(freq => (
                            <option key={freq} value={freq}>{freq}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tasa % por período</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                          value={createForm.rate}
                          onChange={(e) => handleCreateFormChange({ rate: e.target.value })}
                          placeholder="Ej: 4"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Períodos de rédito proyectados
                        <span className="text-slate-400 font-normal"> (calendario de vencimientos)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                        value={createForm.openTerm}
                        onChange={(e) => handleCreateFormChange({ openTerm: e.target.value })}
                      />
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-[11px] text-blue-700 dark:text-blue-300">
                      Rédito {createForm.frequency.toLowerCase()}:{' '}
                      <span className="font-bold text-sm">
                        {formatCurrency(calculatePeriodInterest(
                          (parseFloat(createForm.amount) || 0) + (parseFloat(createForm.closingCosts) || 0),
                          parseFloat(createForm.rate) || 0
                        ))}
                      </span>
                      {' '}({(parseFloat(createForm.rate) || 0).toFixed(2)}% — el capital permanece intacto si solo paga réditos)
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Gastos Cierre <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <MoneyInput
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                      value={createForm.closingCosts}
                      onChange={(val) => handleCreateFormChange({ closingCosts: val })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Fecha inicio
                      <span className="text-slate-400 font-normal"> (puede ser retroactiva)</span>
                    </label>
                    <input
                      type="date"
                      max={toDateInputValue(new Date())}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                      value={createForm.startDate}
                      onChange={(e) => handleCreateFormChange({ startDate: e.target.value })}
                    />
                  </div>
                </div>

                {createRetrospectivePreview?.isRetrospective && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-bold mb-1">Préstamo retroactivo ({createRetrospectivePreview.daysSinceStart} días desde el inicio)</p>
                    {createForm.loanType === 'OPEN' ? (
                      <p>
                        Interés devengado hasta hoy:{' '}
                        <span className="font-semibold">{formatCurrency(createRetrospectivePreview.pendingInterest)}</span>
                        {' '}• Por {createForm.frequency.toLowerCase()}:{' '}
                        <span className="font-semibold">{formatCurrency(createRetrospectivePreview.periodInterest || 0)}</span>
                      </p>
                    ) : (
                      <p>
                        Cuotas vencidas al crear:{' '}
                        <span className="font-semibold">{createRetrospectivePreview.overdueInstallments}</span>
                        {' '}de {createRetrospectivePreview.totalPendingInstallments || createForm.term} cuotas proyectadas
                      </p>
                    )}
                  </div>
                )}

                {createForm.closingCosts > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">Se suma al capital para calcular las cuotas</p>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3">
                  <button
                    type="button"
                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 sm:py-2.5 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[44px] active:scale-95 touch-manipulation"
                    onClick={() => { setCreateModalOpen(false); setCreateError(''); }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-2.5 rounded-xl font-semibold transition-colors min-h-[44px] active:scale-95 touch-manipulation"
                  >
                    Crear Préstamo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Master-detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* ── Panel izquierdo: lista ── */}
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-3 min-h-0 ${selectedLoan ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-blue-600" />
              Préstamos
            </h2>
            {onCreateLoan && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all min-h-[40px] active:scale-95 shadow-sm shadow-blue-600/20"
              >
                <Plus size={16} /> Nuevo
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Cartera</p>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100 tabular-nums truncate">{formatCurrency(loanStats.totalPortfolio)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-900/10 border border-violet-100 dark:border-violet-800">
              <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wide">Por cobrar</p>
              <p className="text-sm font-bold text-violet-900 dark:text-violet-100 tabular-nums truncate">{formatCurrency(loanStats.totalPending)}</p>
            </div>
          </div>

          <Card className="flex-shrink-0 !p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[120px] p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="COMPLETED">Completados</option>
                <option value="DEFAULTED">En mora</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Tipos</option>
                <option value="FIXED">Cuotas</option>
                <option value="OPEN">Libres</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="date-desc">Reciente</option>
                <option value="amount-desc">Mayor monto</option>
                <option value="client-asc">A-Z</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">{filteredLoans.length} préstamos</p>
          </Card>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
            {filteredLoans.map(l => {
              const client = clients.find(c => c.id === l.clientId);
              const isSelected = selectedLoanId === l.id;
              const isOpen = l.loanType === 'OPEN' || l.amortizationType === 'OPEN';
              const progress = getPaymentProgress(l);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => { onSelectLoan?.(l.id); setDetailTab('overview'); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.01]'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                        {client?.name || 'Sin cliente'}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {formatCurrency(l.amount)} · {l.rate}% {isOpen ? 'libre' : `${l.term || ''} cuotas`}
                      </p>
                    </div>
                    <ChevronRight size={16} className={`flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isOpen
                        ? isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {isOpen ? 'Libre' : 'Cuotas'}
                    </span>
                    {!isOpen && progress > 0 && (
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isSelected ? 'bg-white/80' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    <Badge status={l.status} />
                  </div>
                </button>
              );
            })}
            {filteredLoans.length === 0 && (
              <div className="p-8 text-center text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <LayoutList size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay préstamos</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: detalle ── */}
        <div className={`lg:col-span-7 xl:col-span-8 min-h-0 ${!selectedLoan ? 'hidden lg:block' : ''}`}>
          {!selectedLoan ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Banknote size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Selecciona un préstamo</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Elige un cliente de la lista para ver detalles, registrar pagos y consultar el cronograma.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full animate-fade-in">
              {/* Header del detalle */}
              <div className="flex items-start justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <button
                    onClick={() => onSelectLoan?.(null)}
                    className="lg:hidden flex items-center gap-1 text-xs text-blue-600 font-semibold mb-2"
                  >
                    <X size={14} /> Volver a la lista
                  </button>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                    {selectedClient?.name || 'Cliente'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(selectedLoan.amount)}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{selectedLoan.rate}% {isSelectedLoanOpen ? `/${selectedLoan.frequency?.toLowerCase() || 'mes'}` : ''}</span>
                    <Badge status={selectedLoan.status} />
                    {isSelectedLoanOpen && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">Libre</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onNavigateToDocuments && selectedClient && (
                    <button
                      onClick={() => onNavigateToDocuments(selectedClient.id)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title="Documentos"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => onSelectLoan?.(null)}
                    className="hidden lg:flex p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    title="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Cobro', icon: Wallet },
                  { id: 'schedule', label: isSelectedLoanOpen ? 'Réditos' : 'Amortización', icon: LayoutList },
                  { id: 'history', label: 'Historial', icon: Receipt },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      detailTab === tab.id
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Cobro */}
              {detailTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Capital</p>
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(selectedLoan.currentBalance || selectedLoan.amount)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Total pagado</p>
                        <p className="text-base font-bold text-emerald-600 tabular-nums">{formatCurrency(selectedLoan.totalPaid || 0)}</p>
                      </div>
                    </div>

                    {firstPendingInstallment && !isSelectedLoanOpen && (
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-2">Próxima cuota</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">#{firstPendingInstallment.number} · {formatDate(firstPendingInstallment.date)}</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100 my-2 tabular-nums">{formatCurrency(firstPendingInstallment.payment)}</p>
                        <button
                          onClick={() => {
                            setPenaltyAmountInput('');
                            setPaymentToConfirm({
                              loanId: selectedLoan.id,
                              installmentId: firstPendingInstallment.id,
                              amount: firstPendingInstallment.payment,
                              interestAmount: firstPendingInstallment.interest || 0,
                              number: firstPendingInstallment.number,
                              date: firstPendingInstallment.date,
                              clientName: selectedClient?.name || 'Sin cliente',
                            });
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                        >
                          Registrar pago de cuota
                        </button>
                      </div>
                    )}

                    {isSelectedLoanOpen && openLoanSummary?.nextDue && (
                      <div className={`p-4 rounded-xl border ${
                        openLoanSummary.overdueCount > 0
                          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      }`}>
                        <p className="font-bold text-sm mb-1 flex items-center gap-1">
                          {openLoanSummary.overdueCount > 0
                            ? <><AlertTriangle size={14} className="text-rose-600" /> Rédito en mora</>
                            : 'Próximo rédito'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Período #{openLoanSummary.nextDue.number} · {formatDate(openLoanSummary.nextDue.date)}
                        </p>
                        <p className="text-xl font-bold tabular-nums my-1">{formatCurrency(openLoanSummary.nextDue.interest)}</p>
                        {openLoanSummary.totalMora > 0 && (
                          <p className="text-xs text-rose-600 font-semibold">+ Mora: {formatCurrency(openLoanSummary.totalMora)}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedLoan.status !== 'COMPLETED' && (
                    <Card className="!p-4 space-y-3">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {isSelectedLoanOpen ? 'Registrar pago a réditos' : 'Abono a rédito/capital'}
                      </p>
                      {isSelectedLoanOpen && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                          El capital ({formatCurrency(selectedLoan.currentBalance || selectedLoan.amount)}) permanece intacto si solo paga réditos. Puede abonar cualquier monto en cualquier momento.
                        </p>
                      )}
                      {selectedLoanRetrospective?.isRetrospective && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1">
                          Retroactivo: {selectedLoanRetrospective.daysSinceStart} días
                          {isSelectedLoanOpen && openLoanSummary?.overdueCount > 0 && (
                            <> · {openLoanSummary.overdueCount} período(s) vencido(s)</>
                          )}
                        </p>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Rédito pendiente</span>
                        <span className="font-bold text-rose-600 tabular-nums">
                          {formatCurrency(isSelectedLoanOpen ? openLoanPendingInterest : fixedRemainingInterest)}
                        </span>
                      </div>
                      {isSelectedLoanOpen && openLoanPendingInterest > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFreePaymentAmount(String(openLoanPendingInterest));
                            setFreePaymentInterestOnly(true);
                          }}
                          className="w-full border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 py-2 rounded-lg font-semibold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Pagar rédito pendiente ({formatCurrency(openLoanPendingInterest)})
                        </button>
                      )}
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={freePaymentInterestOnly}
                          onChange={(e) => setFreePaymentInterestOnly(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        Solo réditos (capital intacto)
                      </label>
                      <MoneyInput
                        value={freePaymentAmount}
                        onChange={(val) => setFreePaymentAmount(val)}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                        placeholder="Monto del pago"
                      />
                      <input
                        type="date"
                        max={toDateInputValue(new Date())}
                        value={freePaymentDate}
                        onChange={(e) => setFreePaymentDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
                      />
                      <textarea
                        value={freePaymentNotes}
                        onChange={(e) => setFreePaymentNotes(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
                        rows={2}
                        placeholder="Notas (opcional)"
                      />
                      <button
                        onClick={async () => {
                          const receipt = await registerPayment(selectedLoan.id, null, {
                            customAmount: parseFloat(freePaymentAmount || 0),
                            useFreePayment: true,
                            interestOnly: freePaymentInterestOnly,
                            paymentDate: freePaymentDate || null,
                            notes: freePaymentNotes || null
                          });
                          if (receipt) {
                            setReceiptToShow(receipt);
                            setFreePaymentAmount('');
                            setFreePaymentNotes('');
                            setFreePaymentInterestOnly(isSelectedLoanOpen);
                            setFreePaymentDate(toDateInputValue(new Date()));
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-sm shadow-blue-600/20"
                      >
                        {freePaymentInterestOnly ? 'Registrar pago a réditos' : 'Registrar abono'}
                      </button>
                    </Card>
                  )}
                </div>
              )}

              {/* Tab: Cronograma / Réditos */}
              {detailTab === 'schedule' && (
                <Card className="flex-1 min-h-0 flex flex-col !p-0 overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {isSelectedLoanOpen ? 'Calendario de réditos' : 'Hoja de amortización'}
                    </h4>
                    {!isSelectedLoanOpen && (
                      <button onClick={handlePrintAmortization} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                        <Printer size={14} /> Imprimir
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    {isSelectedLoanOpen ? (
                      <>
                        {/* Mobile cards */}
                        <div className="sm:hidden p-3 space-y-2">
                          {(openLoanSummary?.periods || []).map(p => (
                            <div key={p.number} className={`p-3 rounded-xl border text-sm ${
                              p.status === 'OVERDUE' ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10 dark:border-rose-800'
                              : p.status === 'PAID' ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10'
                              : 'border-slate-200 dark:border-slate-700'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold">#{p.number} · {formatDate(p.date)}</span>
                                <Badge status={p.status === 'PAID' ? 'PAID' : p.status === 'OVERDUE' ? 'LATE' : 'PENDING'} />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Rédito: {formatCurrency(p.interest)}</span>
                                {p.mora > 0 && <span className="text-rose-600">Mora: {formatCurrency(p.mora)}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Desktop table */}
                        <table className="hidden sm:table w-full text-xs md:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                            <tr>
                              <th className="p-2.5 text-left">#</th>
                              <th className="p-2.5 text-left">Vence</th>
                              <th className="p-2.5 text-right">Rédito</th>
                              <th className="p-2.5 text-right">Pagado</th>
                              <th className="p-2.5 text-right">Mora</th>
                              <th className="p-2.5 text-right">Capital</th>
                              <th className="p-2.5 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {(openLoanSummary?.periods || []).map(p => (
                              <tr key={p.number} className={p.status === 'OVERDUE' ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}>
                                <td className="p-2.5">{p.number}</td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">{formatDate(p.date)}</td>
                                <td className="p-2.5 text-right font-medium tabular-nums">{formatCurrency(p.interest)}</td>
                                <td className="p-2.5 text-right text-emerald-600 tabular-nums">{formatCurrency(p.paidAmount || 0)}</td>
                                <td className="p-2.5 text-right text-rose-600 tabular-nums">{p.mora > 0 ? formatCurrency(p.mora) : '—'}</td>
                                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatCurrency(p.balance)}</td>
                                <td className="p-2.5 text-center">
                                  <Badge status={p.status === 'PAID' ? 'PAID' : p.status === 'OVERDUE' ? 'LATE' : 'PENDING'} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <table className="w-full text-xs md:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                          <tr>
                            <th className="p-2.5 text-left">#</th>
                            <th className="p-2.5 text-left">Fecha</th>
                            <th className="p-2.5 text-right">Cuota</th>
                            <th className="p-2.5 text-right hidden md:table-cell">Interés</th>
                            <th className="p-2.5 text-right hidden md:table-cell">Capital</th>
                            <th className="p-2.5 text-right">Saldo</th>
                            <th className="p-2.5 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {(selectedLoan.schedule || []).map(inst => {
                            const isOverdue = inst.status !== 'PAID' && parseDateOnly(inst.date) && parseDateOnly(inst.date) < parseDateOnly(new Date());
                            return (
                              <tr key={inst.id} className={isOverdue ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}>
                                <td className="p-2.5">{inst.number}</td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">{formatDate(inst.date)}</td>
                                <td className="p-2.5 text-right font-medium tabular-nums">{formatCurrency(inst.payment)}</td>
                                <td className="p-2.5 text-right text-rose-500 hidden md:table-cell tabular-nums">{formatCurrency(inst.interest ?? 0)}</td>
                                <td className="p-2.5 text-right text-emerald-600 hidden md:table-cell tabular-nums">{formatCurrency(inst.principal ?? 0)}</td>
                                <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatCurrency(inst.balance ?? 0)}</td>
                                <td className="p-2.5 text-center">
                                  <Badge status={inst.status === 'PAID' ? 'PAID' : isOverdue ? 'LATE' : 'PENDING'} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              )}

              {/* Tab: Historial */}
              {detailTab === 'history' && (
                <Card className="flex-1 min-h-0 overflow-hidden !p-0">
                  <div className="overflow-y-auto overflow-x-auto max-h-[60vh] lg:max-h-none">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-left">Fecha</th>
                          <th className="p-2.5 text-right">Monto</th>
                          <th className="p-2.5 text-right">A rédito</th>
                          <th className="p-2.5 text-right">A capital</th>
                          <th className="p-2.5 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {(selectedLoan.freePayments || []).map(p => (
                          <tr key={p.id}>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{formatDate(p.date)}</td>
                            <td className="p-2.5 text-right font-medium tabular-nums">{formatCurrency(p.amount || 0)}</td>
                            <td className="p-2.5 text-right text-rose-500 tabular-nums">{formatCurrency(p.toInterest || 0)}</td>
                            <td className="p-2.5 text-right text-emerald-600 tabular-nums">{formatCurrency(p.toPrincipal || 0)}</td>
                            <td className="p-2.5 text-right text-slate-500 tabular-nums">{formatCurrency(p.balanceAfter || 0)}</td>
                          </tr>
                        ))}
                        {(!selectedLoan.freePayments || selectedLoan.freePayments.length === 0) && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              <Receipt size={28} className="mx-auto mb-2 opacity-30" />
                              Sin pagos registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Acciones rápidas */}
              <div className="flex flex-wrap gap-2 flex-shrink-0 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onClick={handleGenerateContract} disabled={generatingContract} className="text-xs px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  {generatingContract ? 'Generando...' : 'Contrato IA'}
                </button>
                {selectedLoan.status === 'ACTIVE' && (
                  <button onClick={() => setCancelModal(true)} className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 font-semibold hover:bg-amber-100">Cancelar</button>
                )}
                <button onClick={() => setArchiveModal(true)} className="text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200">Archivar</button>
                <button onClick={() => setNotesModal({ show: true, loanId: selectedLoan.id, notes: selectedLoan.notes || '' })} className="text-xs px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 font-semibold hover:bg-violet-100">Notas</button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Reprint Receipt Modal */}
      {reprintReceipt && (
        <PaymentTicket
          receipt={reprintReceipt}
          systemSettings={systemSettings}
          onClose={() => setReprintReceipt(null)}
          isCopy={true}
        />
      )}

      {/* Cancel Loan Modal */}
      {cancelModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-sm animate-fade-in">
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
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => { setCancelModal(false); setCancelReason(''); }}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] active:scale-95 touch-manipulation"
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
                    window.location.reload();
                  } catch (e) {
                    setCancelModal(false);
                    setErrorModal({ show: true, message: e.message || 'Error al cancelar préstamo' });
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 min-h-[44px] active:scale-95 touch-manipulation"
              >
                {actionLoading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Loan Modal */}
      {archiveModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Archive size={20} /> {selectedLoan.archived ? 'Desarchivar' : 'Archivar'} Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {selectedLoan.archived
                ? 'Este préstamo volverá a aparecer en la lista principal.'
                : 'El préstamo se ocultará de la vista principal pero no se eliminará.'}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setArchiveModal(false)}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] active:scale-95 touch-manipulation"
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
                    window.location.reload();
                  } catch (e) {
                    setArchiveModal(false);
                    setErrorModal({ show: true, message: e.message || 'Error al archivar préstamo' });
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-700 min-h-[44px] active:scale-95 touch-manipulation"
              >
                {actionLoading ? 'Procesando...' : (selectedLoan.archived ? 'Desarchivar' : 'Archivar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Loan Modal */}
      {deleteModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <Trash2 size={20} /> Eliminar Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              ⚠️ <strong>Esta acción es irreversible.</strong>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Se eliminará permanentemente el préstamo y todos sus datos asociados.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] active:scale-95 touch-manipulation"
              >
                No, volver
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await loanApi.delete(selectedLoan.id);
                    onSelectLoan?.(null);
                    window.location.reload();
                  } catch (e) {
                    alert(e.message || 'Error al eliminar');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 min-h-[44px] active:scale-95 touch-manipulation"
              >
                {actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 11: Renew Loan Modal */}
      {renewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
              <RefreshCw size={20} /> Renovar Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Este préstamo está completado. ¿Deseas crear un nuevo préstamo para el mismo cliente con las mismas condiciones?
            </p>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 mb-4 text-sm">
              <p><span className="font-semibold">Cliente:</span> {selectedClient?.name}</p>
              <p><span className="font-semibold">Monto anterior:</span> {formatCurrency(selectedLoan.amount)}</p>
              <p><span className="font-semibold">Tasa:</span> {selectedLoan.rate}%</p>
              <p><span className="font-semibold">Plazo:</span> {selectedLoan.term} cuotas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRenewModal(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onCreateLoan) {
                    onCreateLoan({
                      clientId: selectedLoan.clientId,
                      amount: selectedLoan.amount,
                      rate: selectedLoan.rate,
                      term: selectedLoan.term,
                      frequency: selectedLoan.frequency,
                      amortizationType: selectedLoan.amortizationType,
                      renewedFrom: selectedLoan.id
                    });
                  }
                  setRenewModal(false);
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Crear Nuevo Préstamo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 12: Refinance Loan Modal */}
      {refinanceModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
              <Wallet size={20} /> Refinanciar Préstamo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Consolidar el saldo pendiente ({formatCurrency(selectedLoan.currentBalance || (parseFloat(selectedLoan.amount) * (1 + parseFloat(selectedLoan.rate) / 100)) - (selectedLoan.totalPaid || 0))}) en un nuevo préstamo.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">⚠️ Advertencia:</p>
              <p>Al refinanciar, el préstamo actual se marcará como completado y se creará uno nuevo con el saldo pendiente.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRefinanceModal(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const pendingBalance = selectedLoan.currentBalance ||
                    (parseFloat(selectedLoan.amount) * (1 + parseFloat(selectedLoan.rate) / 100)) - (selectedLoan.totalPaid || 0);
                  if (onCreateLoan) {
                    onCreateLoan({
                      clientId: selectedLoan.clientId,
                      amount: pendingBalance,
                      rate: selectedLoan.rate,
                      term: selectedLoan.term,
                      frequency: selectedLoan.frequency,
                      amortizationType: selectedLoan.amortizationType,
                      refinancedFrom: selectedLoan.id
                    });
                  }
                  setRefinanceModal(false);
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-500"
              >
                Refinanciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 14: Notes Modal */}
      {notesModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-2">
              <StickyNote size={20} /> Notas del Préstamo
            </h3>
            <textarea
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              placeholder="Agrega observaciones, comentarios o información importante sobre este préstamo..."
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 min-h-[120px] text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setNotesModal({ show: false, loanId: null, notes: '' })}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onUpdateLoan && selectedLoan) {
                    onUpdateLoan({ ...selectedLoan, notes: notesModal.notes });
                  }
                  setNotesModal({ show: false, loanId: null, notes: '' });
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-500"
              >
                Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 13: Loan History (shown in notes modal if history exists) */}
      {selectedLoan?.history && selectedLoan.history.length > 0 && notesModal.show && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 max-w-xs z-40 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
            <History size={14} /> Historial de cambios
          </h4>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 max-h-32 overflow-y-auto">
            {selectedLoan.history.slice(-5).map((h, i) => (
              <li key={i}>{formatDate(h.date)} - {h.action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Modal - replaces browser alert() */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 safe-area-insets">
          <div className="my-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Error</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {errorModal.message}
            </p>
            <button
              onClick={() => setErrorModal({ show: false, message: '' })}
              className="w-full py-2.5 rounded-lg font-semibold bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoansView;
