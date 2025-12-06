import React, { useState, useEffect, useRef } from 'react';
import { Zap, X } from 'lucide-react';
import AIHelper from './AIHelper.jsx';

export function FloatingAIBot({ chatHistory, setChatHistory, dbData, showToast }) {
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
      className="fixed z-40 flex flex-col items-end gap-3 pointer-events-none"
      style={{ right: position.x, bottom: position.y }}
    >
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
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onClick={handleToggle}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-900/40 flex items-center justify-center text-white border border-white/10 hover:scale-105 active:scale-95 transition-transform touch-none"
      >
        <Zap size={24} />
      </button>
    </div>
  );
}

export default FloatingAIBot;
