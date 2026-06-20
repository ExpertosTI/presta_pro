import React from 'react';
import logoSmall from '../../../logo.png';

export function Sidebar({ activeTab, setActiveTab, children, companyName }) {
  return (
    <aside className="flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 h-screen md:h-full shadow-2xl z-50 safe-area-insets">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
        <div 
          style={{ backgroundColor: 'var(--color-primary)' }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300"
        >
          <img src={logoSmall} alt="Logo" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">Presta Pro</h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-0.5 uppercase">Panel de Control</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain py-4 sm:py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {children}
      </nav>

      {/* Footer moved inside Sidebar to be part of the layout */}
      <div className="mt-auto pt-6 border-t border-slate-800/60 text-center pb-4">
        <p className="text-[10px] text-slate-500">Powered by</p>
        <p className="font-extrabold text-slate-400 text-xs tracking-widest mt-0.5">{companyName || 'RENACE.TECH'}</p>
      </div>
    </aside>
  );
}

export default Sidebar;

