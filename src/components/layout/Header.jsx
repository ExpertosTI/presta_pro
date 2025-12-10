import { useState } from 'react';
import logoSmall from '../../../logo-small.svg';
import { Bell, Menu, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Header({ activeTitle, setMobileMenuOpen, theme, toggleTheme, companyName, userName, onLogout, companyLogo, notifications = [], onClearNotifications }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

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

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-full relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 text-[10px] text-white font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 glass rounded-xl overflow-hidden animate-fade-in z-50 shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Notificaciones</h3>
                <button onClick={() => setNotifOpen(false)}>
                  <X size={16} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No hay notificaciones</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <div className="flex gap-2 items-start">
                        {getNotifIcon(n.type)}
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-200">{n.text}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.date).toLocaleString('es-DO')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && onClearNotifications && (
                <button
                  onClick={() => { onClearNotifications(); setNotifOpen(false); }}
                  className="w-full px-4 py-2 text-sm text-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                >
                  Limpiar todas
                </button>
              )}
            </div>
          )}
        </div>

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

