import React from 'react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900/80 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 ${className} print:border-none print:shadow-none`}>
    {children}
  </div>
);

export default Card;
