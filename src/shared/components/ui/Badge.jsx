import React from 'react';

const CONFIGS = {
  ACTIVE:   { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500',   label: 'Activo'      },
  PAID:     { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Pagado'   },
  LATE:     { bg: 'bg-rose-100 dark:bg-rose-900/40',   text: 'text-rose-700 dark:text-rose-300',   dot: 'bg-rose-500',   label: 'Atrasado'    },
  PENDING:  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500',  label: 'Pendiente'   },
  APPROVED: { bg: 'bg-teal-100 dark:bg-teal-900/40',   text: 'text-teal-700 dark:text-teal-300',   dot: 'bg-teal-500',   label: 'Aprobado'    },
  REJECTED: { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500',    label: 'Rechazado'   },
  REVIEW:   { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', label: 'En revisión' },
  CANCELLED:{ bg: 'bg-slate-100 dark:bg-slate-800',    text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400',  label: 'Cancelado'   },
  COMPLETED:{ bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Completado' },
};

const DEFAULT = { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400', label: '' };

const Badge = ({ status, showDot = true, className = '' }) => {
  const cfg = CONFIGS[status] || DEFAULT;
  const label = cfg.label || status || '—';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none ${cfg.bg} ${cfg.text} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />}
      {label}
    </span>
  );
};

export default Badge;
