import React from 'react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className} print:border-none print:shadow-none`}>
    {children}
  </div>
);

export default Card;
