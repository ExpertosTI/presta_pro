import React, { useState, useEffect, useRef } from 'react';
import { Bot, X } from 'lucide-react';
import AIHelper from './AIHelper.jsx';

export function FloatingAIBot({ chatHistory, setChatHistory, dbData, showToast, ownerName, companyName }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 96 });
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef(null);
  const movedRef = useRef(false);

  const startDrag = (clientX, clientY) => {
    setDragging(true);
    movedRef.current = false;
    dragStateRef.current = {
      startX: clientX,
      startY: clientY,
      startPos: position,
    };
  };

  const handlePointerDown = (event) => {
    const point = event.touches ? event.touches[0] : event;
    startDrag(point.clientX, point.clientY);
  };

  const handlePointerMove = (event) => {
    const data = dragStateRef.current;
    if (!data) return;
    const point = event.touches ? event.touches[0] : event;
    const dx = point.clientX - data.startX;
    const dy = point.clientY - data.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedRef.current = true;
    }

    const minMargin = 12;
    const buttonSize = 64;
    const maxRight = Math.max(minMargin, window.innerWidth - buttonSize - minMargin);
    const maxBottom = Math.max(minMargin, window.innerHeight - buttonSize - minMargin);

    const nextRight = Math.min(Math.max(data.startPos.x - dx, minMargin), maxRight);
    const nextBottom = Math.min(Math.max(data.startPos.y - dy, minMargin), maxBottom);

    setPosition({ x: nextRight, y: nextBottom });
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event) => {
      event.preventDefault();
      handlePointerMove(event);
    };

    const stop = () => {
      setDragging(false);
      setTimeout(() => {
        movedRef.current = false;
      }, 0);
    };

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };
  }, [dragging]);

  const handleToggle = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((prev) => !prev);
  };

  return (
    <div
      className="fixed z-[100] flex flex-col items-end gap-3 pointer-events-none"
      style={{ right: position.x, bottom: position.y }}
    >
      {open && (
        <div className="pointer-events-auto w-[360px] max-w-[90vw] h-[520px] max-h-[80vh] rounded-2xl shadow-2xl border border-slate-800/70 bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/95">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Bot size={18} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-slate-50">Asistente IA</span>
                <span className="text-[11px] text-slate-400">Bot contable de {companyName || 'tu financiera'}</span>
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
              ownerName={ownerName}
              companyName={companyName}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onClick={handleToggle}
        className="pointer-events-auto w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-white border-2 border-white/20 hover:scale-110 active:scale-95 transition-all duration-300 touch-none relative group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Bot size={28} className="drop-shadow-md" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-sky-500 border-2 border-white dark:border-slate-900"></span>
        </span>
      </button>
    </div>
  );
}

export default FloatingAIBot;
