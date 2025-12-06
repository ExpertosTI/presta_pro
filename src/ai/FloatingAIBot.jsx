import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';
import AIHelper from './AIHelper.jsx';

export function FloatingAIBot({ chatHistory, setChatHistory, dbData, showToast }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-[360px] max-w-[90vw] h-[520px] max-h-[80vh] rounded-2xl shadow-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/95">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Zap size={18} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-slate-50">Asistente IA</span>
                <span className="text-[11px] text-slate-400">Bot contable de Renace</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 bg-slate-950/60 p-2">
            <AIHelper
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              dbData={dbData}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-900/40 flex items-center justify-center text-white border border-white/10 hover:scale-105 active:scale-95 transition-transform"
      >
        <Zap size={24} />
      </button>
    </div>
  );
}

export default FloatingAIBot;
