import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog - Native app confirmation modal
 * Replaces browser confirm() for consistent UX
 */
export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Estás seguro?',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger' // 'danger' | 'warning' | 'info'
}) {
    if (!isOpen) return null;

    const confirmButtonClasses = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-600 hover:bg-amber-700 text-white',
        info: 'bg-blue-600 hover:bg-blue-700 text-white',
    };

    const iconColors = {
        danger: 'text-red-500',
        warning: 'text-amber-500',
        info: 'text-blue-500',
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in safe-area-insets backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700 ${iconColors[variant]} flex-shrink-0`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px] active:scale-95 touch-manipulation"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 sm:py-2.5 rounded-xl font-medium transition-colors min-h-[44px] active:scale-95 touch-manipulation ${confirmButtonClasses[variant]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
