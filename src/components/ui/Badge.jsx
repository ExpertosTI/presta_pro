import React from 'react';

export function Badge({ status }) {
  const styles = {
    ACTIVE: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    LATE: 'bg-red-100 text-red-800',
    PENDING: 'bg-slate-100 text-slate-800',
    APPROVED: 'bg-teal-100 text-teal-800',
    REJECTED: 'bg-red-50 text-red-600',
    REVIEW: 'bg-yellow-100 text-yellow-800',
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
}

export default Badge;
