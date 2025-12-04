import React from 'react';
import logoSmall from '../../../logo-small.svg';
import { Bell, Menu } from 'lucide-react';

export function Header({ activeTitle, setMobileMenuOpen }) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 print:hidden">
      <div className="md:hidden flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)}><Menu /></button>
        <img src={logoSmall} alt="Presta Pro" className="w-7 h-7 rounded-lg object-contain" />
        <span className="font-bold text-slate-800">Presta Pro</span>
      </div>
      <h1 className="hidden md:block text-xl font-bold text-slate-800">{activeTitle}</h1>
      <div className="flex items-center gap-4">
        <button className="bg-slate-100 p-2 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
          <span className="text-sm font-bold hidden md:block">Admin</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
