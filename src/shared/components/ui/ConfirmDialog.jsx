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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700 ${iconColors[variant]}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${confirmButtonClasses[variant]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
