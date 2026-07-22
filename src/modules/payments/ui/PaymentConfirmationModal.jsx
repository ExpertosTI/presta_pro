import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import MoneyInput from '../../../shared/components/ui/MoneyInput.jsx';
import { MapPin, Loader2 } from 'lucide-react';

export default function PaymentConfirmationModal({
    paymentToConfirm,
    onConfirm,
    onCancel
}) {
    const [customPaymentAmount, setCustomPaymentAmount] = useState('');
    const [showPenaltyInput, setShowPenaltyInput] = useState(false);
    const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
    const [interestOnlyMode, setInterestOnlyMode] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('pending'); // pending | loading | success | error
    const gpsRef = useRef({ lat: null, lng: null });

    const interestAmount = parseFloat(paymentToConfirm?.interestAmount || paymentToConfirm?.interest || 0) || 0;
    const canPayInterestOnly = interestAmount > 0;

    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            return;
        }
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                gpsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setGpsStatus('success');
            },
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }, []);

    const handleToggleInterestOnly = () => {
        const next = !interestOnlyMode;
        setInterestOnlyMode(next);
        if (next) {
            setShowPenaltyInput(false);
            setPenaltyAmountInput('');
            setCustomPaymentAmount(String(interestAmount));
        } else {
            setCustomPaymentAmount('');
        }
    };

    const handleTogglePenalty = () => {
        const next = !showPenaltyInput;
        setShowPenaltyInput(next);
        if (next) {
            setInterestOnlyMode(false);
        } else {
            setPenaltyAmountInput('');
        }
    };

    const handleConfirm = () => {
        let options = {};

        const inputVal = parseFloat(customPaymentAmount);
        if (!isNaN(inputVal)) {
            options.customAmount = inputVal;
        } else {
            options.customAmount = interestOnlyMode && interestAmount > 0
                ? interestAmount
                : paymentToConfirm.amount;
        }

        if (interestOnlyMode) {
            options.useFreePayment = true;
            options.interestOnly = true;
            options.installmentNumber = paymentToConfirm.number;
            options.notes = `Rédito cuota #${paymentToConfirm.number} (capital intacto)`;
        }

        if (showPenaltyInput && !interestOnlyMode) {
            const penaltyVal = parseFloat(penaltyAmountInput) || 0;
            if (penaltyVal > 0) {
                options = { ...options, withPenalty: true, penaltyAmount: penaltyVal };
            }
        }

        if (gpsRef.current.lat != null) {
            options.collectorLat = gpsRef.current.lat;
            options.collectorLng = gpsRef.current.lng;
        }

        onConfirm(paymentToConfirm.loanId, paymentToConfirm.installmentId, options);
    };

    return (
        <div
            data-modal-sheet
            className="fixed inset-0 bg-slate-900/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in safe-area-insets"
        >
            <div className="w-full sm:max-w-md max-h-[min(92dvh,100%)] bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirmar pago</h3>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p>Cliente: <span className="font-bold">{paymentToConfirm.clientName}</span></p>
                        <p>Cuota: <span className="font-bold">#{paymentToConfirm.number}</span></p>
                        <p>Vencimiento: <span className="font-bold">{formatDate(paymentToConfirm.date)}</span></p>
                        {canPayInterestOnly && (
                            <p className="mt-1 text-blue-700 dark:text-blue-300">
                                Rédito de esta cuota: <span className="font-bold">{formatCurrency(interestAmount)}</span>
                            </p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {interestOnlyMode ? 'Monto solo a rédito' : 'Monto a cobrar'}
                        </label>
                        <MoneyInput
                            name="payment_custom_amount_unique_id"
                            autoComplete="off"
                            data-lpignore="true"
                            value={customPaymentAmount}
                            onChange={(val) => setCustomPaymentAmount(val)}
                            className="w-full px-4 py-3 rounded-lg border-2 text-slate-900 dark:text-slate-100 text-xl font-bold focus:outline-none focus:ring-2 transition-all border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 focus:ring-blue-500 focus:border-blue-600"
                            placeholder={interestOnlyMode
                                ? `Rédito: ${formatCurrency(interestAmount)}`
                                : `Sugerido: ${formatCurrency(paymentToConfirm.amount)}`}
                            autoFocus
                        />
                        <div className="flex justify-between items-center mt-2 gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {interestOnlyMode
                                    ? 'Solo rédito • Capital intacto'
                                    : `Total cuota: ${formatCurrency(paymentToConfirm.amount)}`}
                            </p>
                            <button
                                type="button"
                                onClick={() => setCustomPaymentAmount(
                                    String(interestOnlyMode ? interestAmount : paymentToConfirm.amount).replace(/[^0-9.]/g, '')
                                )}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline min-h-[44px] px-2 touch-manipulation"
                            >
                                Usar sugerido
                            </button>
                        </div>
                    </div>

                    {interestOnlyMode && (
                        <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                            Este pago se aplicará <strong>solo al rédito</strong>. El capital del préstamo no se reducirá.
                        </div>
                    )}

                    {showPenaltyInput && !interestOnlyMode && (
                        <div className="mb-4 animate-slide-up">
                            <label className="block text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
                                Monto de mora (Adicional)
                            </label>
                            <MoneyInput
                                name="penalty_amount_unique_id"
                                autoComplete="off"
                                data-lpignore="true"
                                value={penaltyAmountInput}
                                onChange={(val) => setPenaltyAmountInput(val)}
                                className="w-full px-4 py-3 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600"
                                placeholder="Ej: 50"
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 items-center mb-4">
                        {canPayInterestOnly && (
                            <button
                                type="button"
                                onClick={handleToggleInterestOnly}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold min-h-[44px] px-2 touch-manipulation"
                            >
                                {interestOnlyMode ? '✕ Quitar modo rédito' : `+ Pagar solo rédito (${formatCurrency(interestAmount)})`}
                            </button>
                        )}
                        {!interestOnlyMode && (
                            <button
                                type="button"
                                onClick={handleTogglePenalty}
                                className="text-xs text-amber-600 dark:text-amber-400 font-semibold min-h-[44px] px-2 touch-manipulation"
                            >
                                {showPenaltyInput ? '✕ Quitar mora' : '+ Agregar mora'}
                            </button>
                        )}
                    </div>

                    <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg text-xs font-medium ${
                        gpsStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                        gpsStatus === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                        gpsStatus === 'error' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                        'bg-slate-50 dark:bg-slate-800 text-slate-500'
                    }`}>
                        {gpsStatus === 'loading' && <Loader2 size={14} className="animate-spin shrink-0" />}
                        {(gpsStatus === 'success' || gpsStatus === 'error') && <MapPin size={14} className="shrink-0" />}
                        <span>
                            {gpsStatus === 'loading' && 'Obteniendo ubicación...'}
                            {gpsStatus === 'success' && 'Ubicación capturada'}
                            {gpsStatus === 'error' && 'GPS no disponible — el pago se registrará sin ubicación'}
                            {gpsStatus === 'pending' && 'Preparando GPS...'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 p-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0 safe-area-bottom bg-white dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`w-full text-white text-base font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] min-h-[48px] touch-manipulation ${
                            interestOnlyMode
                                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                        }`}
                    >
                        {interestOnlyMode ? 'Confirmar pago solo a rédito' : 'Confirmar pago'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full py-3 px-4 text-sm text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700/50 rounded-lg min-h-[48px] flex items-center justify-center touch-manipulation"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
