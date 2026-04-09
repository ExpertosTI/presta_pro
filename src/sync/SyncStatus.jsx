/**
 * SyncStatus — Badge de estado de sincronización
 *
 * Muestra en tiempo real:
 *  - Número de cobros/operaciones pendientes de sincronizar
 *  - Spinner cuando hay sync en curso
 *  - Check verde cuando todo está sincronizado
 *  - Icono nube-roja cuando hay errores y sin red
 *
 * Diseñado para integrarse en el Header o Sidebar sin breakpoints adicionales.
 *
 * Uso:
 *   import SyncStatus from './sync/SyncStatus';
 *   <SyncStatus />
 *
 *   // Variante compacta (solo ícono):
 *   <SyncStatus compact />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, Cloud as CloudUpload, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import syncEngine from './SyncEngine.js';
import syncQueue from './SyncQueue.js';
import networkMonitor from './NetworkMonitor.js';

export default function SyncStatus({ compact = false }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [isOnline,     setIsOnline]     = useState(networkMonitor.isOnline);
  const [hasErrors,    setHasErrors]    = useState(false);
  const [lastSyncAt,   setLastSyncAt]   = useState(null); // eslint-disable-line no-unused-vars
  const [flash,        setFlash]        = useState(false); // flash verde al completar

  // ── Refrescar el count de pendientes ──────────────────────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);

      // Detectar si hay errores persistentes
      const errorItems = await syncQueue.getRetryable(99999);
      setHasErrors(errorItems.some((i) => i.retries >= 3));
    } catch (_) { /* ignorar si la DB no está lista */ }
  }, []);

  useEffect(() => {
    refreshCount();

    // ── Listeners del SyncEngine ────────────────────────────────────────────
    const unsubEnqueue = syncEngine.on('enqueue', () => {
      setPendingCount((n) => n + 1);
    });

    const unsubStart = syncEngine.on('syncStart', () => {
      setIsSyncing(true);
    });

    const unsubEnd = syncEngine.on('syncEnd', ({ synced }) => {
      setIsSyncing(false);
      refreshCount();
      setLastSyncAt(new Date().toISOString());

      if (synced > 0) {
        // Flash verde breve
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
    });

    const unsubError = syncEngine.on('syncError', () => {
      setIsSyncing(false);
      refreshCount();
    });

    const unsubCount = syncEngine.on('pendingCountChange', ({ count }) => {
      setPendingCount(count);
    });

    // ── Listeners de red ────────────────────────────────────────────────────
    const unsubOnline  = networkMonitor.on('online',  () => setIsOnline(true));
    const unsubOffline = networkMonitor.on('offline', () => setIsOnline(false));

    // ── Polling de fallback cada 5s para mantener el count actualizado ──────
    const interval = setInterval(refreshCount, 5_000);

    return () => {
      unsubEnqueue();
      unsubStart();
      unsubEnd();
      unsubError();
      unsubCount();
      unsubOnline();
      unsubOffline();
      clearInterval(interval);
    };
  }, [refreshCount]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleForceSync = async (e) => {
    e.stopPropagation();
    await syncEngine.forceSync();
  };

  // ── Determinar estado visual ──────────────────────────────────────────────

  const getState = () => {
    if (!isOnline && pendingCount > 0) return 'offline-pending';
    if (!isOnline)                     return 'offline-clean';
    if (isSyncing)                     return 'syncing';
    if (flash)                         return 'done';
    if (hasErrors && pendingCount > 0) return 'error';
    if (pendingCount > 0)              return 'pending';
    return 'clean';
  };

  const state = getState();

  const stateConfig = {
    'offline-pending': {
      icon:    CloudOff,
      color:   'text-amber-400',
      bg:      'bg-amber-500/10 border-amber-500/30',
      label:   `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} · Sin red`,
      pulse:   false,
    },
    'offline-clean': {
      icon:    CloudOff,
      color:   'text-slate-400',
      bg:      'bg-slate-700/50 border-slate-600/30',
      label:   'Sin conexión',
      pulse:   false,
    },
    'syncing': {
      icon:    RefreshCw,
      color:   'text-blue-400',
      bg:      'bg-blue-500/10 border-blue-500/30',
      label:   'Sincronizando…',
      pulse:   true,
    },
    'done': {
      icon:    CheckCircle2,
      color:   'text-emerald-400',
      bg:      'bg-emerald-500/10 border-emerald-500/30',
      label:   'Sincronizado',
      pulse:   false,
    },
    'error': {
      icon:    AlertCircle,
      color:   'text-red-400',
      bg:      'bg-red-500/10 border-red-500/30',
      label:   `${pendingCount} con error`,
      pulse:   false,
    },
    'pending': {
      icon:    CloudUpload,
      color:   'text-blue-300',
      bg:      'bg-blue-500/10 border-blue-500/30',
      label:   `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`,
      pulse:   false,
    },
    'clean': {
      icon:    Cloud,
      color:   'text-slate-400',
      bg:      'bg-transparent border-transparent',
      label:   'Sincronizado',
      pulse:   false,
    },
  };

  const cfg = stateConfig[state];
  const Icon = cfg.icon;

  // ── Variante compacta (solo ícono + badge número) ─────────────────────────

  if (compact) {
    return (
      <button
        onClick={pendingCount > 0 ? handleForceSync : undefined}
        title={cfg.label}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-slate-700/50"
      >
        <Icon
          size={18}
          className={`${cfg.color} ${cfg.pulse ? 'animate-spin' : ''}`}
        />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>
    );
  }

  // ── Variante completa ─────────────────────────────────────────────────────

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
        transition-all duration-300 select-none
        ${cfg.bg}
      `}
    >
      <Icon
        size={14}
        className={`${cfg.color} flex-shrink-0 ${cfg.pulse ? 'animate-spin' : ''}`}
      />
      <span className={cfg.color}>{cfg.label}</span>

      {/* Botón de sync manual — solo cuando hay pendientes y hay red */}
      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={handleForceSync}
          title="Sincronizar ahora"
          className="ml-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <RefreshCw size={11} />
        </button>
      )}
    </div>
  );
}
