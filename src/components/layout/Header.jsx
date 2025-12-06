import { useState } from 'react';
import logoSmall from '../../../logo-small.svg';
import { Bell, Menu } from 'lucide-react';

export function Header({ activeTitle, setMobileMenuOpen, theme, toggleTheme, companyName, userName, onLogout, companyLogo }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 glass z-20 sticky top-0 flex items-center justify-between px-6 transition-all print:hidden">
      <div className="md:hidden flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)}><Menu className="text-slate-700 dark:text-slate-200" /></button>
        <img src={companyLogo || logoSmall} alt={companyName || "Presta Pro"} className="w-7 h-7 rounded-lg object-contain" />
        <span className="font-bold text-slate-800 dark:text-slate-100">{companyName || "Presta Pro"}</span>
      </div>
      <h1 className="hidden md:block text-xl font-bold text-slate-800 dark:text-slate-100">{activeTitle}</h1>
      <div className="flex items-center gap-4 relative">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
        >
          <span className="block dark:hidden">🌙</span>
          <span className="hidden dark:block">☀️</span>
        </button>
        <button className="p-2 rounded-full relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              {(userName || 'Admin').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold hidden md:block text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
              {userName || 'Admin'}
            </span>
          </button>
          {userMenuOpen && onLogout && (
            <div className="absolute right-0 mt-2 w-48 glass rounded-xl py-1 text-sm animate-fade-in z-50">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 mb-1">
                <p className="font-bold text-slate-800 dark:text-slate-100">{userName || 'Admin'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sesión activa</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors"
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
