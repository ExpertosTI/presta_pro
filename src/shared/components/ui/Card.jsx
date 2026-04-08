import React from 'react';

const Card = ({ children, className = "", variant = "default", onClick }) => {
  const base = "rounded-2xl overflow-hidden p-3 sm:p-4 transition-all duration-200 print:border-none print:shadow-none";
  const variants = {
    default: "bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md",
    glass:   "bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/40 shadow-lg",
    flat:    "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800",
    accent:  "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-900/20",
    danger:  "bg-white dark:bg-slate-800/90 border border-rose-200 dark:border-rose-800/60 shadow-sm",
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

Card.Header = function CardHeader({ children, className = "", border = true }) {
  return (
    <div className={`px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3 ${border ? 'border-b border-slate-200/80 dark:border-slate-700/60' : ''} ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = "" }) {
  return (
    <div className={`px-4 sm:px-5 md:px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = "", border = true }) {
  return (
    <div className={`px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 pt-3 ${border ? 'border-t border-slate-200/80 dark:border-slate-700/60' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
