import React from 'react';
import { Plus } from 'lucide-react';

/**
 * EmptyState — consistent empty/zero-data placeholder.
 * Usage: <EmptyState icon={Users} title="Sin clientes" description="..." action="Agregar" onAction={fn} />
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon size={28} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95 touch-manipulation min-h-[44px]"
        >
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
