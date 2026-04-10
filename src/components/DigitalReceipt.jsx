import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, CheckCircle, Share2, Printer, Bluetooth, ChevronDown, Wifi, Globe } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../shared/utils/formatters';
import {
    printReceipt,
    getPrinterConfig,
    savePrinterConfig,
    getAvailableDrivers,
    scanBluetoothPrinter,
    connectBluetoothPrinter,
    getBluetoothConnectionStatus,
    PRINTER_DRIVERS,
} from '../services/thermalPrinter';

const DigitalReceipt = ({ receipt, onClose, onPrint, companyName, baseAmount, penaltyAmount, companyLogo }) => {
    const receiptRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showPrinterMenu, setShowPrinterMenu] = useState(false);
    const [printerStatus, setPrinterStatus] = useState('');
    const [printerConfig] = useState(() => getPrinterConfig());

    const receiptBaseAmount = typeof receipt?.amount === 'number' ? receipt.amount : parseFloat(receipt?.amount || 0) || 0;
    const receiptPenaltyAmount = typeof receipt?.penaltyAmount === 'number' ? receipt.penaltyAmount : parseFloat(receipt?.penaltyAmount || 0) || 0;

    const finalBaseAmount = baseAmount !== undefined ? baseAmount : receiptBaseAmount;
    const finalPenaltyAmount = penaltyAmount !== undefined ? penaltyAmount : receiptPenaltyAmount;
    const total = finalBaseAmount + finalPenaltyAmount;

    const handleShareImage = async () => {
        if (!receiptRef.current) return;
        setIsSharing(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) { setIsSharing(false); return; }

                if (navigator.share && navigator.canShare) {
                    const file = new File([blob], `comprobante-${receipt.id}.png`, { type: 'image/png' });
                    const shareData = { files: [file], title: 'Comprobante de Pago', text: `Comprobante de pago - ${companyName}` };
                    if (navigator.canShare(shareData)) {
                        try { await navigator.share(shareData); setIsSharing(false); return; } catch { /* cancelled */ }
                    }
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprobante-${receipt.id}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setIsSharing(false);
            }, 'image/png');
        } catch (error) {
            console.error('Error generating receipt image', error);
            setIsSharing(false);
        }
    };

    const handlePrint = async (driverOverride = null) => {
        setIsPrinting(true);
        setPrinterStatus('Imprimiendo...');
        setShowPrinterMenu(false);

        try {
            await printReceipt(receipt, { companyName, companyLogo }, driverOverride);
            setPrinterStatus('Impreso correctamente');
            setTimeout(() => setPrinterStatus(''), 2000);
        } catch (error) {
            setPrinterStatus(`Error: ${error.message}`);
            setTimeout(() => setPrinterStatus(''), 4000);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleConnectBluetooth = async () => {
        setPrinterStatus('Buscando impresoras...');
        try {
            const device = await scanBluetoothPrinter();
            setPrinterStatus(`Conectando a ${device.name || 'impresora'}...`);
            await connectBluetoothPrinter(device);
            savePrinterConfig({ driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS });
            setPrinterStatus(`Conectado: ${device.name}`);
            setTimeout(() => setPrinterStatus(''), 3000);
        } catch (error) {
            setPrinterStatus(`Error: ${error.message}`);
            setTimeout(() => setPrinterStatus(''), 4000);
        }
    };

    const btStatus = getBluetoothConnectionStatus();
    const availableDrivers = getAvailableDrivers();

    const getDriverIcon = (driver) => {
        switch (driver) {
            case PRINTER_DRIVERS.RAWBT: return <Wifi size={16} />;
            case PRINTER_DRIVERS.BLUETOOTH_ESCPOS: return <Bluetooth size={16} />;
            default: return <Globe size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in safe-area-insets">
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:rounded-3xl shadow-2xl sm:max-w-sm overflow-hidden flex flex-col sm:max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 dark:bg-slate-950 text-white px-3 py-2.5 flex items-center justify-between flex-shrink-0 safe-area-top">
                    <span className="font-bold text-base">Comprobante</span>
                    <button onClick={onClose} className="p-2 -mr-1 hover:bg-white/10 rounded-full transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-900 thermal-receipt" ref={receiptRef}>
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900">
                        <div className="flex flex-col items-center mb-2">
                            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-1.5 shadow-lg shadow-emerald-500/30">
                                <CheckCircle size={28} className="text-white" strokeWidth={3} />
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 text-center">
                                Transacción completada!
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {formatDateTime(receipt.date)}
                            </p>
                            <div className="mt-1 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-600 dark:text-slate-400">
                                {receipt?.id?.slice(0, 12) || 'N/A'}
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 shadow-sm border border-slate-100 dark:border-slate-700 mb-2 text-center">
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Monto Total</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                                {formatCurrency(total)}
                            </p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                PAGO DE PRESTAMO
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 space-y-0.5">
                            <div className="flex items-start gap-2">
                                <div className="mt-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Cliente</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">{receipt.clientName}</p>
                                    {receipt.clientPhone && <p className="text-[10px] text-slate-400">{receipt.clientPhone}</p>}
                                </div>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>

                            {receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                        {receipt.isPartialPayment ? 'Abonos Realizados' : 'Cuotas Pagadas'}
                                    </p>
                                    {receipt.paymentBreakdown.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                            <span className="text-slate-700 dark:text-slate-300">{item.isPartialPayment ? `Abono a Cuota #${item.number}` : `Cuota #${item.number}`}</span>
                                            <span className="font-semibold text-emerald-600">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    {receipt.penaltyAmount > 0 && (
                                        <div className="flex justify-between text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                            <span className="text-amber-700 dark:text-amber-300">Mora</span>
                                            <span className="font-semibold text-amber-600">{formatCurrency(receipt.penaltyAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Detalle</p>
                                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                            {receipt.isPartialPayment ? `Abono a Cuota #${receipt.installmentNumber}` : `Cuota #${receipt.installmentNumber}`}
                                        </p>
                                        {finalPenaltyAmount > 0 && (
                                            <p className="text-xs text-amber-600 font-semibold">Incluye mora: {formatCurrency(finalPenaltyAmount)}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {receipt.remainingBalance !== undefined && receipt.remainingBalance > 0 && (
                                <>
                                    <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Saldo Pendiente:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(receipt.remainingBalance)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Printer Status */}
                {printerStatus && (
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs text-center font-medium flex-shrink-0">
                        {printerStatus}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 safe-area-bottom">
                    <div className="flex gap-2">
                        <button
                            onClick={handleShareImage}
                            disabled={isSharing}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white py-2.5 sm:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 min-h-[44px]"
                        >
                            {isSharing ? '...Generando' : <><Share2 size={16} /> Compartir</>}
                        </button>

                        {/* Print button with dropdown */}
                        <div className="relative">
                            <div className="flex">
                                <button
                                    onClick={() => handlePrint()}
                                    disabled={isPrinting}
                                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-3 rounded-l-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center disabled:opacity-50"
                                    title="Imprimir con driver actual"
                                >
                                    <Printer size={20} />
                                </button>
                                <button
                                    onClick={() => setShowPrinterMenu(!showPrinterMenu)}
                                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 rounded-r-xl border-l border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 transition-colors min-h-[48px] flex items-center"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>

                            {/* Printer selector dropdown */}
                            {showPrinterMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-50 animate-fade-in">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Seleccionar Impresora</p>
                                        {btStatus.connected && (
                                            <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                {btStatus.deviceName}
                                            </p>
                                        )}
                                    </div>

                                    {availableDrivers.map((brand) => (
                                        <button
                                            key={brand.id}
                                            onClick={() => {
                                                savePrinterConfig({ driver: brand.driver, brand: brand.id });
                                                handlePrint(brand.driver);
                                            }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 flex items-center gap-3 transition-colors text-sm min-h-[44px]"
                                        >
                                            <span className="text-slate-400">{getDriverIcon(brand.driver)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{brand.name}</p>
                                                <p className="text-[10px] text-slate-400">{brand.platforms.join(', ')}</p>
                                            </div>
                                        </button>
                                    ))}

                                    {/* Connect Bluetooth option */}
                                    <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                                        <button
                                            onClick={handleConnectBluetooth}
                                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 text-blue-600 dark:text-blue-400 text-sm font-medium min-h-[44px]"
                                        >
                                            <Bluetooth size={16} />
                                            <span>{btStatus.connected ? 'Reconectar Bluetooth' : 'Conectar Impresora Bluetooth'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DigitalReceipt;
