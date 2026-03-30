import { useState } from 'react';
import logoSmall from '../../../../logo-small.svg';
import { Menu } from 'lucide-react';
import { NotificationBell } from '../../../modules/notifications';

export function Header({ activeTitle, setMobileMenuOpen, theme, toggleTheme, companyName, userName, onLogout, companyLogo, onNavigate }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-14 sm:h-16 glass z-20 sticky top-0 flex items-center justify-between px-4 sm:px-6 transition-all print:hidden safe-area-top">
      {/* Mobile: Logo + Company */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
          aria-label="Abrir menu"
        >
          <Menu size={22} className="text-slate-700 dark:text-slate-200" />
        </button>
        <img src={companyLogo || logoSmall} alt={companyName || "Presta Pro"} className="w-7 h-7 rounded-lg object-contain" />
        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[120px]">{companyName || "Presta Pro"}</span>
      </div>

      {/* Desktop: Title */}
      <h1 className="hidden md:block text-xl font-bold text-slate-800 dark:text-slate-100">{activeTitle}</h1>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-4 relative">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 touch-manipulation"
          aria-label="Cambiar tema"
        >
          <span className="block dark:hidden text-lg">🌙</span>
          <span className="hidden dark:block text-lg">☀️</span>
        </button>

        <div className="relative">
          <NotificationBell onNavigateToNotifications={() => onNavigate && onNavigate('notifications')} />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 focus:outline-none min-h-[44px] touch-manipulation"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-sm">
              {(userName || 'Admin').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold hidden md:block text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
              {userName || 'Admin'}
            </span>
          </button>
          {userMenuOpen && onLogout && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 glass rounded-xl py-1 text-sm animate-fade-in z-50 shadow-2xl">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 mb-1">
                  <p className="font-bold text-slate-800 dark:text-slate-100">{userName || 'Admin'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sesion activa</p>
                </div>
                <button
                  type="button"
                  onClick={() => { onLogout(); setUserMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors min-h-[44px] active:bg-red-100"
                >
                  Cerrar sesion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
