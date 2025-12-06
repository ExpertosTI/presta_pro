import React, { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateSchedule } from '../utils/amortization';

export function LoansView({ loans, clients, registerPayment, selectedLoanId, onSelectLoan, onUpdateLoan, addClientDocument }) {
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractContent, setContractContent] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [showPenaltyInput, setShowPenaltyInput] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
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
      console.error(error);
      alert('Error generando el contrato. Verifica la configuración de la API Key.');
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleDownloadContractTxt = () => {
    if (!contractContent || !selectedClient) return;
    const blob = new Blob([contractContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_${selectedClient.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-lg">Contrato Generado por IA</h3>
              <button onClick={() => setShowContractModal(false)} className="text-slate-500 hover:text-slate-800 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm whitespace-pre-wrap bg-slate-50">
              {contractContent}
            </div>
            <div className="p-4 border-t flex gap-3 justify-end bg-white rounded-b-2xl">
              <button
                onClick={handleDownloadContractTxt}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
              >
                Descargar .TXT
              </button>
              <button
                onClick={handlePrintContract}
                className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-slate-600"
              >
                Imprimir / PDF
              </button>
              <button
                onClick={handleSaveContractToDocuments}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700"
              >
                Guardar en Documentos
              </button>
              <button
                onClick={() => setShowContractModal(false)}
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cerrar
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
                return (
                  <tr
                    key={l.id}
                    onClick={() => onSelectLoan && onSelectLoan(l.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <td className="p-2 text-slate-800 dark:text-slate-200">{client?.name || 'Sin cliente'}</td>
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
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      <span className="font-semibold">Monto de la cuota:</span> {formatCurrency(paymentToConfirm.amount)}
                    </p>
                    {showPenaltyInput && (
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Monto de mora</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={penaltyAmountInput}
                          onChange={(e) => setPenaltyAmountInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                      className="mb-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold"
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
      </Card>

      {selectedLoan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
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

            {Array.isArray(selectedLoan.schedule) && selectedLoan.schedule.some(i => i.status === 'PAID') ? (
              <p className="mt-2 text-xs text-slate-500">
                Este préstamo ya tiene pagos registrados y no se puede editar.
              </p>
            ) : (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleOpenEditLoan}
                  className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                  Editar préstamo
                </button>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={handleGenerateContract}
                disabled={generatingContract}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {generatingContract ? 'Generando...' : 'Generar Contrato Legal (IA)'}
              </button>
            </div>

            {firstPendingInstallment && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Próxima cuota pendiente</p>
                <p className="text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold">Cuota #{firstPendingInstallment.number}</span> • {formatDate(firstPendingInstallment.date)}
                </p>
                <p className="text-slate-700 dark:text-slate-300 mb-2">
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
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700"
                >
                  Registrar Pago de esta Cuota
                </button>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
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
      )}
    </div>
  );
}

export default LoansView;
