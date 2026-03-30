import React, { useState, useCallback, createContext, useContext, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertCircle,
};

const COLORS = {
  success: 'bg-emerald-500',
  error:   'bg-rose-600',
  info:    'bg-blue-600',
  warning: 'bg-amber-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Toast container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {toasts.map(toast => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold pointer-events-auto animate-slide-in-right max-w-xs ${COLORS[toast.type] || COLORS.info}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="p-0.5 hover:opacity-75 touch-manipulation"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to use the toast function anywhere inside ToastProvider */
export function useToast() {
  return useContext(ToastContext);
}

export default ToastProvider;
