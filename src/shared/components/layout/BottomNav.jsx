import React from 'react';

export function BottomNav({ activeTab, setActiveTab, setMobileMenuOpen, items }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/40 dark:border-slate-800/40 flex justify-around py-1.5 px-1 md:hidden print:hidden z-40 safe-area-bottom shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id !== 'more' && activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'more') {
                setMobileMenuOpen(true);
              } else {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }
            }}
            className={`flex flex-col items-center text-[10px] font-semibold min-w-[50px] min-h-[50px] justify-center rounded-2xl transition-all duration-300 active:scale-95 touch-manipulation ${
              isActive
                ? 'text-[var(--color-primary)] scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 transition-all duration-300 ${
                isActive
                  ? 'shadow-sm shadow-[var(--color-primary-dark-bg)]'
                  : 'bg-transparent'
              }`}
              style={isActive ? { backgroundColor: 'var(--color-primary-bg)' } : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} className="transition-transform duration-300" />
            </div>
            <span className="transition-all duration-300">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
