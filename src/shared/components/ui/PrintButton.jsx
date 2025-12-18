/**
 * PrintButton Component
 * RenKredit by Renace.tech
 * 
 * Botón de impresión reutilizable con soporte para diferentes tipos de recibo
 */

import React, { useState } from 'react';
import { Printer, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import PrintingService from '../../services/printingService';

/**
 * Props:
 * - type: 'payment' | 'loan' | 'route' | 'test'
 * - data: objeto con datos para el recibo
 * - onPrint: callback después de imprimir
 * - disabled: deshabilitar botón
 * - size: 'sm' | 'md' | 'lg'
 * - variant: 'primary' | 'secondary' | 'ghost'
 */
export default function PrintButton({
    type = 'test',
    data = {},
    onPrint,
    disabled = false,
    size = 'md',
    variant = 'primary',
    label,
    className = ''
}) {
    const [printing, setPrinting] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null

    const isAvailable = PrintingService.isAvailable();

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs gap-1',
        md: 'px-3 py-2 text-sm gap-2',
        lg: 'px-4 py-3 text-base gap-2'
    };

    const variantClasses = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
    };

    const handlePrint = async () => {
        if (printing || disabled) return;

        setPrinting(true);
        setStatus(null);

        try {
            let result;

            switch (type) {
                case 'payment':
                    result = await PrintingService.printPaymentReceipt(data);
                    break;
                case 'loan':
                    result = await PrintingService.printLoanSummary(data);
                    break;
                case 'route':
                    result = await PrintingService.printRouteClosing(data);
                    break;
                case 'test':
                default:
                    result = await PrintingService.printTest();
                    break;
            }

            if (result.success) {
                setStatus('success');
                onPrint?.({ success: true, type });
            } else {
                setStatus('error');
                onPrint?.({ success: false, message: result.message });
            }
        } catch (error) {
            console.error('Print error:', error);
            setStatus('error');
            onPrint?.({ success: false, error });
        } finally {
            setPrinting(false);
            // Reset status after 3 seconds
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const getLabel = () => {
        if (printing) return 'Imprimiendo...';
        if (label) return label;

        switch (type) {
            case 'payment': return 'Imprimir Recibo';
            case 'loan': return 'Imprimir Resumen';
            case 'route': return 'Imprimir Cierre';
            case 'test': return 'Test Impresora';
            default: return 'Imprimir';
        }
    };

    const getIcon = () => {
        if (status === 'success') return <CheckCircle size={16} className="text-green-500" />;
        if (status === 'error') return <AlertCircle size={16} className="text-red-500" />;
        return <Printer size={16} />;
    };

    if (!isAvailable) {
        return (
            <button
                disabled
                className={`inline-flex items-center rounded-lg opacity-50 cursor-not-allowed ${sizeClasses[size]} ${variantClasses.secondary} ${className}`}
                title="Impresión solo disponible en la app Android"
            >
                <Smartphone size={16} />
                <span>Solo en App</span>
            </button>
        );
    }

    return (
        <button
            onClick={handlePrint}
            disabled={printing || disabled}
            className={`inline-flex items-center rounded-lg transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${printing ? 'opacity-70' : ''} ${className}`}
        >
            {getIcon()}
            <span>{getLabel()}</span>
        </button>
    );
}

/**
 * Componente de configuración de impresión
 */
export function PrinterSettings({ showToast }) {
    const isAvailable = PrintingService.isAvailable();

    const handleTestPrint = async () => {
        const result = await PrintingService.printTest();
        if (result.success) {
            showToast?.('Enviado a imprimir. Asegúrate de tener RawBt instalado.', 'info');
        } else {
            showToast?.(result.message || 'Error al imprimir', 'error');
        }
    };

    const handleInstallRawBt = () => {
        const url = 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter';
        if (typeof window !== 'undefined') {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Impresora Térmica</h3>
                    <p className="text-sm text-slate-500">Configuración de impresión ESC/POS</p>
                </div>
            </div>

            {!isAvailable ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                La impresión térmica solo está disponible en la app Android
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                                Descarga la app desde Play Store para usar esta función.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Requisitos</h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                Impresora térmica Bluetooth/WiFi/USB
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                App RawBt instalada
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                Compatible con ESC/POS (58mm o 80mm)
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleTestPrint}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Printer size={16} />
                            Test de Impresión
                        </button>

                        <button
                            onClick={handleInstallRawBt}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                            <Smartphone size={16} />
                            Instalar RawBt
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                <p className="text-xs text-slate-500">
                    Impresoras soportadas: 58mm y 80mm. Modelos: Xprinter, Goojprt, POS-5890K, y otras compatibles ESC/POS.
                </p>
            </div>
        </div>
    );
}
