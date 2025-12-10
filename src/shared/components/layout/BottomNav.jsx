import React from 'react';

export function BottomNav({ activeTab, setActiveTab, setMobileMenuOpen, items }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2 px-1 md:hidden print:hidden z-40">
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
            className={`flex flex-col items-center text-[10px] font-medium ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 ${
                isActive ? 'bg-blue-50' : 'bg-slate-100'
              }`}
            >
              <Icon size={18} />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
