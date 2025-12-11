import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { X, Share2, Printer, Download, CheckCircle } from 'lucide-react';

export function PaymentTicket({ receipt, companyName = 'Renace.tech', systemSettings = {}, onClose }) {
  if (!receipt) return null;

  const displayCompanyName = systemSettings.companyName || companyName;
  const hasPenalty = receipt.penalty && receipt.penalty > 0;
  const hasMultipleInstallments = receipt.paidInstallments && receipt.paidInstallments.length > 0;

  const handleShare = async () => {
    const text = `
✅ RECIBO DE PAGO
${displayCompanyName}

📋 Recibo #: ${receipt.id.substr(0, 8).toUpperCase()}
📅 Fecha: ${formatDateTime(receipt.date)}
👤 Cliente: ${receipt.clientName}

💰 Monto: ${formatCurrency(receipt.amount)}
${hasPenalty ? `⚠️ Mora: ${formatCurrency(receipt.penalty)}` : ''}
💵 TOTAL: ${formatCurrency(receipt.total || (receipt.amount + (receipt.penalty || 0)))}

${receipt.remainingBalance !== undefined ? `📊 Saldo: ${formatCurrency(receipt.remainingBalance)}` : ''}

¡Gracias por su pago!
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Recibo de Pago', text });
      } catch (err) {
        // User cancelled or error
        navigator.clipboard?.writeText(text);
      }
    } else {
      navigator.clipboard?.writeText(text);
      alert('Recibo copiado al portapapeles');
    }
  };

  const handlePrint = () => {
    window.print();
    setTimeout(() => onClose?.(), 500);
  };

  return (
    <>
      {/* Print-only version (hidden on screen) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[100] p-4 font-mono text-black text-xs leading-tight">
        <div className="max-w-[80mm] mx-auto text-center">
          <h1 className="text-xl font-bold mb-1">{displayCompanyName}</h1>
          <p className="mb-2">RNC: 101-00000-1</p>
          <p className="mb-4 border-b border-black pb-2">RECIBO DE INGRESO</p>

          <div className="text-left mb-2">
            <p><strong>Recibo #:</strong> {receipt.id.substr(0, 8).toUpperCase()}</p>
            <p><strong>Fecha:</strong> {formatDateTime(receipt.date)}</p>
            <p><strong>Cliente:</strong> {receipt.clientName}</p>
            <p><strong>Préstamo ID:</strong> {receipt.loanId.substr(0, 6).toUpperCase()}</p>
          </div>

          <div className="border-y border-black py-2 my-2 text-left">
            {hasMultipleInstallments ? (
              <>
                <p className="font-bold mb-1 text-center border-b border-dashed pb-1">DESGLOSE DE ABONOS</p>
                {receipt.paidInstallments.map((inst, idx) => (
                  <div key={idx} className="mb-1 py-1 border-b border-dotted border-gray-300">
                    <div className="flex justify-between font-semibold">
                      <span>Cuota #{inst.number}:</span>
                      <span>{formatCurrency(inst.amount)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-2 font-bold">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receipt.amount)}</span>
                </div>
              </>
            ) : (
              <>
                <p><strong>{receipt.concept || (receipt.isPartialPayment ? `Abono a Cuota #${receipt.installmentNumber}` : `Cuota #${receipt.installmentNumber}`)}</strong></p>
                <div className="flex justify-between mt-1">
                  <span>Monto:</span>
                  <span>{formatCurrency(receipt.amount)}</span>
                </div>
              </>
            )}

            {hasPenalty && (
              <div className="flex justify-between text-red-600 mt-1">
                <span>Mora:</span>
                <span>{formatCurrency(receipt.penalty)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm mt-2 border-t-2 border-black pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(receipt.total || (receipt.amount + (receipt.penalty || 0)))}</span>
            </div>
          </div>

          <div className="text-left mb-4">
            <p><strong>Cobrador:</strong> {receipt.collectorName || 'Admin'}</p>
            {receipt.remainingBalance !== undefined && (
              <p><strong>Saldo:</strong> {formatCurrency(receipt.remainingBalance)}</p>
            )}
          </div>

          <div className="text-center mt-4">
            <p className="text-[10px]">¡Gracias por su pago!</p>
          </div>
        </div>
      </div>

      {/* Screen Modal (hidden on print) */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-lg font-bold">¡Pago Registrado!</h3>
            <p className="text-sm text-white/80">{displayCompanyName}</p>
          </div>

          {/* Receipt Details */}
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Recibo #</span>
              <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{receipt.id.substr(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Cliente</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{receipt.clientName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">Fecha</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{formatDateTime(receipt.date)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Monto</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(receipt.amount)}</span>
              </div>
              {hasPenalty && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-rose-600">Mora</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(receipt.penalty)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-slate-100">TOTAL</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(receipt.total || (receipt.amount + (receipt.penalty || 0)))}</span>
              </div>
            </div>

            {receipt.remainingBalance !== undefined && (
              <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Saldo del préstamo: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(receipt.remainingBalance)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 grid grid-cols-2 gap-2">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all active:scale-95"
            >
              <Share2 size={18} />
              <span>Compartir</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
            >
              <Printer size={18} />
              <span>Imprimir</span>
            </button>
          </div>

          {/* Close Button */}
          <div className="p-4 pt-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentTicket;
