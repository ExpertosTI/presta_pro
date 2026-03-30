import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Users, Receipt, MapPin, DollarSign,
  FileText, Calculator, ChevronUp
} from 'lucide-react';

/**
 * QuickActionsFAB — Floating Action Button for mobile quick access
 * Shows on mobile only (hidden on md+), expands to reveal common actions
 */
export default function QuickActionsFAB({ onNavigate, onNewClient, onNewLoan }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const actions = [
    {
      icon: Users,
      label: 'Nuevo cliente',
      color: 'bg-violet-500 hover:bg-violet-600',
      onClick: () => { setOpen(false); onNewClient?.(); }
    },
    {
      icon: Receipt,
      label: 'Nuevo préstamo',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => { setOpen(false); onNavigate?.('loans'); }
    },
    {
      icon: MapPin,
      label: 'Ruta de cobros',
      color: 'bg-emerald-500 hover:bg-emerald-600',
      onClick: () => { setOpen(false); onNavigate?.('routes'); }
    },
    {
      icon: DollarSign,
      label: 'Cuadre de caja',
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => { setOpen(false); onNavigate?.('cuadre'); }
    },
    {
      icon: Calculator,
      label: 'Calculadora',
      color: 'bg-slate-500 hover:bg-slate-600',
      onClick: () => { setOpen(false); onNavigate?.('calc'); }
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB container — only on mobile */}
      <div
        ref={ref}
        className="fixed bottom-[5.5rem] right-4 z-50 flex flex-col items-end gap-3 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Action items — slide up when open */}
        {open && (
          <div className="flex flex-col items-end gap-2 animate-slide-up">
            {actions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`flex items-center gap-3 ${action.color} text-white px-4 py-2.5 rounded-2xl shadow-lg min-h-[44px] touch-manipulation active:scale-95 transition-all`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">{action.label}</span>
                  <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-xl flex-shrink-0">
                    <Icon size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Cerrar acciones' : 'Acciones rápidas'}
          aria-expanded={open}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 touch-manipulation fab-shadow
            ${open
              ? 'bg-slate-700 dark:bg-slate-600 rotate-45'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 active:scale-95 hover:from-blue-500 hover:to-indigo-500'
            }`}
        >
          {open
            ? <X size={22} className="text-white" />
            : <Plus size={24} className="text-white" />
          }
        </button>
      </div>
    </>
  );
}
