import { useState } from 'react';
import logoSmall from '../../../logo-small.svg';
import { Bell, Menu } from 'lucide-react';

export function Header({ activeTitle, setMobileMenuOpen, theme, toggleTheme, companyName, userName, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm z-10 print:hidden">
      <div className="md:hidden flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)}><Menu /></button>
        <img src={logoSmall} alt={companyName || "Presta Pro"} className="w-7 h-7 rounded-lg object-contain" />
        <span className="font-bold text-slate-800 dark:text-slate-100">{companyName || "Presta Pro"}</span>
      </div>
      <h1 className="hidden md:block text-xl font-bold text-slate-800 dark:text-slate-100">{activeTitle}</h1>
      <div className="flex items-center gap-4 relative">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="block dark:hidden">🌙</span>
          <span className="hidden dark:block">☀️</span>
        </button>
        <button className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full relative">
          <Bell size={20} className="dark:text-slate-200" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              {(userName || 'Admin').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold hidden md:block dark:text-slate-200 truncate max-w-[140px]">
              {userName || 'Admin'}
            </span>
          </button>
          {userMenuOpen && onLogout && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 text-sm">
              <button
                type="button"
                onClick={onLogout}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
