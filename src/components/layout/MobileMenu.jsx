import React from 'react';
import { X } from 'lucide-react';

export function MobileMenu({ mobileMenuOpen, setMobileMenuOpen, items, setActiveTab }) {
  if (!mobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col p-6 text-white md:hidden animate-fade-in backdrop-blur-sm overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xl font-bold">Menú</span>
        <button onClick={() => setMobileMenuOpen(false)}><X /></button>
      </div>
      <div className="space-y-1">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setMobileMenuOpen(false);
            }}
            className="w-full py-3 border-b border-slate-700 text-left flex items-center gap-3"
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MobileMenu;
