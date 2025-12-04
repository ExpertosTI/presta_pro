import React from 'react';
import logoSmall from '../../../logo-small.svg';
import { LayoutDashboard, Banknote } from 'lucide-react';
import MenuSection from '../ui/MenuSection';
import MenuItem from '../ui/MenuItem';

export function Sidebar({ activeTab, setActiveTab, children }) {
  return (
    <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-2xl z-20 print:hidden">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
          <img src={logoSmall} alt="Presta Pro" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight block leading-none">Presta Pro</span>
          <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Gestión de Préstamos</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <MenuSection title="Tablero de Control">
          <MenuItem icon={LayoutDashboard} label="Tablero" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MenuItem icon={Banknote} label="Cuadre de Caja" active={activeTab === 'cuadre'} onClick={() => setActiveTab('cuadre')} />
        </MenuSection>
        {children}
      </nav>
    </aside>
  );
}

export default Sidebar;
