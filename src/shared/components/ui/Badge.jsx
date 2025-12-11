import React from 'react';

const Badge = ({ status }) => {
  const styles = {
    ACTIVE: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    PAID: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    LATE: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    PENDING: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
    APPROVED: 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200',
    REJECTED: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300',
    REVIEW: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
  };

  const labels = {
    ACTIVE: 'Activo',
    PAID: 'Pagado',
    LATE: 'Atrasado',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    REVIEW: 'En revisión',
  };

  const label = labels[status] || status;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}>
      {label}
    </span>
  );
};

export default Badge;
