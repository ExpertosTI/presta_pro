import React from 'react';

export function MenuItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2 rounded-lg transition-all text-sm font-medium ${
        active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={18} className="mr-3" /> {label}
    </button>
  );
}

export default MenuItem;
