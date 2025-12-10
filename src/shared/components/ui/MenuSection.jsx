import React from 'react';

export function MenuSection({ title, children }) {
  return (
    <div className="mb-2">
      <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">{title}</p>
      {children}
    </div>
  );
}

export default MenuSection;
