import React from 'react';

const Card = ({ children, className = "" }) => (
    <div className={`bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl shadow-sm border border-slate-200 p-6 transition-colors duration-200 ${className} print:border-none print:shadow-none`}>
        {children}
    </div>
);

export default Card;
