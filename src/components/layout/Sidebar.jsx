import React from 'react';
import logoSmall from '../../logo.png';

export function Sidebar({ activeTab, setActiveTab, children, companyName }) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-800 h-screen shadow-2xl z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
          <img src={logoSmall} alt="Logo" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">Presta Pro</h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-wider mt-0.5">PANEL DE CONTROL</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {children}
      </nav>

      {/* Footer moved inside Sidebar to be part of the layout */}
      <div className="mt-auto pt-6 border-t border-slate-800 text-center pb-4">
        <p className="text-[10px] text-slate-500">Powered by</p>
        <p className="font-bold text-slate-400 text-sm tracking-widest">{companyName || 'RENACE.TECH'}</p>
      </div>
    </aside>
  );
}

export default Sidebar;

