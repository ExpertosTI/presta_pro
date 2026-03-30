import React from 'react';

const Card = ({ children, className = "", variant = "default", onClick }) => {
  const base = "rounded-2xl transition-all duration-200 print:border-none print:shadow-none";
  const variants = {
    default: "bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md p-4 sm:p-5 md:p-6",
    glass:   "bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/40 shadow-lg p-4 sm:p-5 md:p-6",
    flat:    "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-5",
    accent:  "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-900/20 p-4 sm:p-5 md:p-6",
  };

  return (
    <div
      className={`${base} ${variants[variant] || variants.default} ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] touch-manipulation' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
