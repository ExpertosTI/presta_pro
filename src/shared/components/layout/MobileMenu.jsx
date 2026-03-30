import React from 'react';
import { X } from 'lucide-react';

export function MobileMenu({ mobileMenuOpen, setMobileMenuOpen, items, setActiveTab }) {
  if (!mobileMenuOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col md:hidden animate-fade-in safe-area-insets"
      onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}
    >
      <div className="flex justify-between items-center p-4 border-b border-slate-700/50">
        <span className="text-xl font-bold text-white">Menu</span>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation text-white"
          aria-label="Cerrar menu"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setMobileMenuOpen(false);
            }}
            className="w-full py-3.5 px-4 rounded-xl text-left flex items-center gap-3 text-white hover:bg-white/5 active:bg-white/10 transition-colors min-h-[48px] touch-manipulation text-base"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon size={20} />
            </div>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-700/50 text-center">
        <p className="text-xs text-slate-500">Powered by RENACE.TECH</p>
      </div>
    </div>
  );
}

export default MobileMenu;
