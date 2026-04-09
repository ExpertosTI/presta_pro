import React from 'react';

export function BottomNav({ activeTab, setActiveTab, setMobileMenuOpen, items }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700/50 flex justify-around py-1.5 px-1 md:hidden print:hidden z-40 safe-area-bottom">
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
            className={`flex flex-col items-center text-[10px] font-medium min-w-[48px] min-h-[48px] justify-center rounded-xl transition-all active:scale-90 touch-manipulation ${
              isActive
                ? 'text-[var(--color-primary)]'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 transition-all ${
                isActive
                  ? 'scale-110 shadow-sm'
                  : 'bg-transparent'
              }`}
              style={isActive ? { backgroundColor: 'var(--color-primary-bg)' } : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className={`transition-all ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
