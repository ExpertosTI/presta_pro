import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { MapPin, Loader2 } from 'lucide-react';

export default function PaymentConfirmationModal({
    paymentToConfirm,
    onConfirm,
    onCancel
}) {
    const [customPaymentAmount, setCustomPaymentAmount] = useState('');
    const [showPenaltyInput, setShowPenaltyInput] = useState(false);
    const [penaltyAmountInput, setPenaltyAmountInput] = useState('');
    const [gpsStatus, setGpsStatus] = useState('pending'); // pending | loading | success | error
    const gpsRef = useRef({ lat: null, lng: null });

    // Auto-capture GPS when modal opens
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

    const handleConfirm = () => {
        let options = {};

        const inputVal = parseFloat(customPaymentAmount);
        if (!isNaN(inputVal)) {
            options.customAmount = inputVal;
        } else {
            options.customAmount = paymentToConfirm.amount;
        }

        if (showPenaltyInput) {
            const penaltyVal = parseFloat(penaltyAmountInput) || 0;
            if (penaltyVal > 0) {
                options = { ...options, withPenalty: true, penaltyAmount: penaltyVal };
            }
        }

        // Attach GPS coordinates
        if (gpsRef.current.lat != null) {
            options.collectorLat = gpsRef.current.lat;
            options.collectorLng = gpsRef.current.lng;
        }

        onConfirm(paymentToConfirm.loanId, paymentToConfirm.installmentId, options);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 flex items-start justify-center z-50 backdrop-blur-sm animate-fade-in safe-area-insets">
            <div className="w-full sm:max-w-md bg-white dark:bg-slate-800 sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:mt-[10vh] sm:border border-slate-200 dark:border-slate-700 overflow-y-auto" style={{ minHeight: '-webkit-fill-available' }}>
                {/* Mobile header bar */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirmar pago</h3>
                    <button
                        onClick={onCancel}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

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

                {/* GPS Status Indicator */}
                <div className={`flex items-center gap-2 mb-6 p-2 rounded-lg text-xs font-medium ${
                    gpsStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    gpsStatus === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                    gpsStatus === 'error' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-slate-50 dark:bg-slate-800 text-slate-500'
                }`}>
                    {gpsStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
                    {gpsStatus === 'success' && <MapPin size={14} />}
                    {gpsStatus === 'error' && <MapPin size={14} />}
                    <span>
                        {gpsStatus === 'loading' && 'Obteniendo ubicación...'}
                        {gpsStatus === 'success' && 'Ubicación capturada'}
                        {gpsStatus === 'error' && 'GPS no disponible — el pago se registrará sin ubicación'}
                        {gpsStatus === 'pending' && 'Preparando GPS...'}
                    </span>
                </div>

                <div className="flex flex-col gap-3 pb-4">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-base font-bold py-3.5 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all transform active:scale-[0.98] min-h-[48px] touch-manipulation"
                    >
                        Confirmar pago
                    </button>
                    <button
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
