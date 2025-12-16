import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { X, Share2, Printer, Download, CheckCircle } from 'lucide-react';

export function PaymentTicket({ receipt, companyName = 'Renace.tech', systemSettings = {}, onClose, isCopy = false }) {
  if (!receipt) return null;

  const displayCompanyName = systemSettings.companyName || companyName;
  const hasPenalty = receipt.penalty && receipt.penalty > 0;
  const hasMultipleInstallments = receipt.paidInstallments && receipt.paidInstallments.length > 0;

  const handleShare = async () => {
    const text = `
✅ RECIBO DE PAGO${isCopy ? ' (COPIA)' : ''}
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
    // Use direct window.print() - CSS handles 58mm thermal formatting
    window.print();
    setTimeout(() => onClose?.(), 300);
  };


  return (
    <>
      {/* Print-only version for 58mm thermal printer (48mm printable width) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[100] p-1 font-mono text-black" style={{ fontSize: '9px', lineHeight: '1.2' }}>
        <div style={{ maxWidth: '48mm', margin: '0 auto' }}>
          {/* COPIA Label for reprints */}
          {isCopy && (
            <div className="text-center font-bold border-2 border-black mb-1 py-0.5" style={{ fontSize: '12px' }}>
              *** COPIA ***
            </div>
          )}
          {/* Header */}
          <div className="text-center border-b border-black pb-1 mb-1">
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{displayCompanyName}</div>
            <div style={{ fontSize: '8px' }}>COMPROBANTE DE PAGO{isCopy ? ' (REIMPRESO)' : ''}</div>
            <div style={{ fontSize: '7px' }}>Ref: {receipt.id.substr(0, 12).toUpperCase()}</div>
            <div style={{ fontSize: '7px' }}>{formatDateTime(receipt.date)}</div>
          </div>

          {/* Client */}
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2px', marginBottom: '2px' }}>
            <div style={{ fontWeight: 'bold' }}>CLIENTE</div>
            <div>{receipt.clientName}</div>
            <div style={{ fontSize: '8px' }}>{receipt.clientPhone || ''}</div>
          </div>

          {/* Loan Summary */}
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2px', marginBottom: '2px' }}>
            <div style={{ fontWeight: 'bold' }}>PRÉSTAMO</div>
            <div className="flex justify-between">
              <span>Capital</span>
              <span>{formatCurrency(receipt.loanAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cuota(s) Pagada(s)</span>
              <span>#{receipt.installmentNumber || 1}</span>
            </div>
            <div className="flex justify-between" style={{ marginTop: '2px', borderTop: '1px dotted #ccc', paddingTop: '2px' }}>
              <span>Saldo Restante</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(receipt.remainingBalance || 0)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '2px', marginBottom: '2px' }}>
            <div style={{ fontWeight: 'bold' }}>DETALLE</div>
            {hasMultipleInstallments ? (
              <>
                {receipt.paidInstallments.map((inst, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Cuota #{inst.number}</span>
                    <span>{formatCurrency(inst.amount)}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex justify-between">
                <span>{receipt.isPartialPayment ? `Abono #${receipt.installmentNumber}` : `Cuota #${receipt.installmentNumber}`}</span>
                <span>{formatCurrency(receipt.amount)}</span>
              </div>
            )}
            {hasPenalty && (
              <div className="flex justify-between">
                <span>Mora</span>
                <span>{formatCurrency(receipt.penalty)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="text-center" style={{ padding: '4px 0', borderBottom: '2px solid #000', marginBottom: '4px' }}>
            <div style={{ fontSize: '8px' }}>TOTAL PAGADO</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(receipt.total || (receipt.amount + (receipt.penalty || 0)))}</div>
            <div style={{ fontSize: '7px' }}>{receipt.isPartialPayment ? 'ABONO A CUOTA' : 'PAGO DE PRÉSTAMO'}</div>
          </div>

          {/* Footer */}
          <div className="text-center" style={{ fontSize: '7px' }}>
            <div style={{ fontWeight: 'bold' }}>¡Gracias por su pago!</div>
            <div style={{ color: '#666' }}>Conserve este comprobante</div>
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
