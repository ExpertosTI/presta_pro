import React from 'react';

const Card = ({ children, className = "" }) => (
  <div className={`glass rounded-xl p-6 ${className} print:border-none print:shadow-none card-hover transition-all duration-300`}>
    {children}
  </div>
);

export default Card;
