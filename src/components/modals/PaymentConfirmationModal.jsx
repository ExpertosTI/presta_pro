import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PaymentConfirmationModal({
    paymentToConfirm,
    onConfirm,
    onCancel
}) {
    const [customPaymentAmount, setCustomPaymentAmount] = useState('');
    const [showPenaltyInput, setShowPenaltyInput] = useState(false);
    const [penaltyAmountInput, setPenaltyAmountInput] = useState('');

    // Initialize with suggested amount when modal opens, or leave empty to encourage explicit entry?
    // User complained "it registered whatever it wanted". 
    // Let's default to empty string but use a placeholder.
    // If user submits empty, we logic handle it.

    const handleConfirm = () => {
        let options = {};

        // 1. Custom Amount Logic
        const inputVal = parseFloat(customPaymentAmount);

        if (!isNaN(inputVal)) {
            // If user typed a number (even 0), use it.
            options.customAmount = inputVal;
        } else {
            // If empty string, user didn't type anything.
            // Logic decision: Do we default to full amount? 
            // User said "I put an amount". If they put an amount, it shouldn't be NaN.
            // IF the browser extension blocked the input event, it would be empty.
            // Let's use the original amount as fallback IF empty, BUT alert user if it's suspicious?
            // No, standard UX is fallback to default payment.
            options.customAmount = paymentToConfirm.amount;
        }

        // 2. Penalty Logic
        if (showPenaltyInput) {
            const penaltyVal = parseFloat(penaltyAmountInput) || 0;
            if (penaltyVal > 0) {
                options = { ...options, withPenalty: true, penaltyAmountOverride: penaltyVal };
            }
        }

        onConfirm(paymentToConfirm.loanId, paymentToConfirm.installmentId, options);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Confirmar pago</h3>

                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <p>Cliente: <span className="font-bold">{paymentToConfirm.clientName}</span></p>
                    <p>Cuota: <span className="font-bold">#{paymentToConfirm.number}</span></p>
                    <p>Vencimiento: <span className="font-bold">{formatDate(paymentToConfirm.date)}</span></p>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        💵 Monto a cobrar
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="payment_custom_amount_unique_id"
                        autoComplete="off"
                        data-lpignore="true"
                        value={customPaymentAmount}
                        onChange={(e) => setCustomPaymentAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-slate-900 dark:text-slate-100 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-all"
                        placeholder={`Sugerido: ${formatCurrency(paymentToConfirm.amount)}`}
                        autoFocus
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total cuota: {formatCurrency(paymentToConfirm.amount)}
                        </p>
                        <button
                            type="button"
                            onClick={() => setCustomPaymentAmount(String(paymentToConfirm.amount))}
                            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                            Usar sugerido
                        </button>
                    </div>
                </div>

                {showPenaltyInput && (
                    <div className="mb-4 animate-slide-up">
                        <label className="block text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
                            💰 Monto de mora (Adicional)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="penalty_amount_unique_id"
                            autoComplete="off"
                            data-lpignore="true"
                            value={penaltyAmountInput}
                            onChange={(e) => setPenaltyAmountInput(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600"
                            placeholder="Ej: 50.00"
                        />
                    </div>
                )}

                <div className="flex justify-between items-center mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            const next = !showPenaltyInput;
                            setShowPenaltyInput(next);
                            if (!next) setPenaltyAmountInput('');
                        }}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold flex items-center gap-1"
                    >
                        {showPenaltyInput ? '✕ Quitar mora' : '+ Agregar mora'}
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-base font-bold py-3 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all transform active:scale-[0.98]"
                    >
                        Confirmar pago
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
