import React, { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateSchedule } from '../utils/amortization';
import { FileText, Sparkles, X, Printer, FileCheck } from 'lucide-react';

export function LoansView({ loans, clients, registerPayment, selectedLoanId, onSelectLoan, onUpdateLoan, addClientDocument }) {
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractContent, setContractContent] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [showPenaltyInput, setShowPenaltyInput] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', rate: '', term: '', frequency: 'Mensual', startDate: '' });
  const [editError, setEditError] = useState('');

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
      );

      const updatedLoan = {
        ...selectedLoan,
        amount,
        rate,
        term,
        frequency: editForm.frequency,
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
      const { generateLoanContract } = await import('../services/aiService');
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
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    const safeContent = contractContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato - ${selectedClient.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
            pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; }
            h1 { text-align: center; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>Contrato de Préstamo</h1>
          <pre>${safeContent}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
      {/* Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-xl sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="text-indigo-500" size={20} />
                  Contrato Generado por IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Revisa el contenido antes de guardar o imprimir.</p>
              </div>
              <button
                onClick={() => setShowContractModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-red-500"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950 font-serif text-slate-800 dark:text-slate-200 leading-relaxed text-justify whitespace-pre-wrap shadow-inner selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 shadow-sm min-h-full">
                {contractContent}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end bg-white dark:bg-slate-900 rounded-b-xl">
              <button
                onClick={handlePrintContract}
                className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all shadow-lg shadow-slate-900/20"
              >
                <Printer size={18} /> Imprimir / PDF
              </button>
              <button
                onClick={handleSaveContractToDocuments}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                <FileCheck size={18} /> Guardar en Documentos
              </button>
            </div>
          </div>
        </div>
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

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Préstamos y Cobros</h2>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Monto</th>
                <th className="p-2 text-left">Tasa</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loans.map(l => {
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
                    <td className="p-2 text-slate-600 dark:text-slate-400">{l.rate}%</td>
                    <td className="p-2"><Badge status={l.status} /></td>
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

              {paymentToConfirm && (
                <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50">
                  <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Confirmar pago</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                      Vas a registrar el pago de la cuota
                      <span className="font-semibold"> #{paymentToConfirm.number}</span> del cliente
                      <span className="font-semibold"> {paymentToConfirm.clientName}</span>.
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                      <span className="font-semibold">Fecha programada:</span> {formatDate(paymentToConfirm.date)}
                    </p>
                    <div className="mb-3">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">💵 Monto a pagar</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customPaymentAmount}
                        onChange={(e) => setCustomPaymentAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-slate-900 dark:text-slate-100 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600"
                        placeholder={`Sugerido: ${formatCurrency(paymentToConfirm.amount)}`}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Cuota sugerida: {formatCurrency(paymentToConfirm.amount)}
                        <span className="ml-2 text-blue-500 cursor-pointer" onClick={() => setCustomPaymentAmount(paymentToConfirm.amount)}>
                          (Usar sugerido)
                        </span>
                      </p>
                    </div>
                    {showPenaltyInput && (
                      <div className="mb-3">
                        <label className="block text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">💰 Monto de mora</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={penaltyAmountInput}
                          onChange={(e) => setPenaltyAmountInput(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600"
                          placeholder="Ej: 50.00"
                          autoFocus
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
                      className="mb-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold"
                    >
                      {showPenaltyInput ? 'Quitar mora' : 'Agregar mora'}
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <button
                        onClick={() => {
                          let options = {};

                          // Custom payment amount
                          // Custom payment amount
                          // Allow any amount that is a valid number
                          const inputVal = parseFloat(customPaymentAmount);
                          if (!isNaN(inputVal)) {
                            options.customAmount = inputVal;
                          } else {
                            // If empty/invalid, use original amount as fallback or let backend decide? 
                            // Current logic implies we must send something. If user cleared it, maybe they want 0?
                            // Let's assume clear = original amount for safety, or prompt. 
                            // User requirement says "allow full flexibility". 
                            // But registerPayment usually expects an amount.
                            // If user explicitly typed 0, customAmount is 0.
                            // If user typed nothing (empty string), let's default to original to avoid NaN errors, 
                            // OR if we want to force explicit entry, we could block.
                            // Given the placeholder shows suggested, defaulting to original if empty is safest UX.
                          }

                          // Penalty
                          if (showPenaltyInput) {
                            const penaltyVal = parseFloat(penaltyAmountInput) || 0;
                            if (penaltyVal > 0) {
                              options = { ...options, withPenalty: true, penaltyAmountOverride: penaltyVal };
                            }
                          }

                          registerPayment(paymentToConfirm.loanId, paymentToConfirm.installmentId, options);
                          setPaymentToConfirm(null);
                          setPenaltyAmountInput('');
                          setCustomPaymentAmount('');
                          setShowPenaltyInput(false);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded-lg"
                      >
                        Confirmar pago
                      </button>
                    </div>
                    <button
                      onClick={() => setPaymentToConfirm(null)}
                      className="mt-3 w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
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
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">Cliente: </span>{selectedClient.name}
              </p>
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
          </Card>

          <Card className="lg:col-span-2 order-2 lg:order-2">
            <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Hoja de amortización</h3>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )
      }
    </div >
  );
}

export default LoansView;
