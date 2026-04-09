/**
 * src/sync/AppLock.js — Locks anti-pérdida de datos
 *
 * Previene que el usuario cierre/salga de la app mientras hay
 * cobros pendientes de sincronizar, en todas las plataformas:
 *
 *   Web / PWA   → beforeunload event (navegador muestra diálogo nativo)
 *   Android     → Capacitor App backButton listener + beforeunload
 *   Electron    → El main process maneja before-quit (ver electron/main.cjs)
 *                 Este módulo expone window.__pendingCount y window.__forceSync
 *
 * Uso:
 *   import { initAppLock, destroyAppLock } from './sync/AppLock';
 *
 *   // En el punto de entrada de la app (main.jsx), después de que syncEngine esté listo:
 *   initAppLock();
 *
 *   // Al desmontar (cleanup):
 *   destroyAppLock();
 */

import syncQueue from './SyncQueue.js';
import syncEngine from './SyncEngine.js';

let _initialized        = false;
let _beforeUnloadHandler = null;
let _capacitorUnsub     = null;
let _syncCountInterval  = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initAppLock() {
  if (_initialized) return;
  _initialized = true;

  // ── Exponer helpers en window para Electron main process ─────────────────
  window.__pendingCount = 0;
  window.__forceSync    = () => syncEngine.forceSync();

  // ── Mantener __pendingCount actualizado ──────────────────────────────────
  const updateCount = async () => {
    try {
      window.__pendingCount = await syncQueue.getPendingCount();
    } catch (_) { /* ignorar si aún no está inicializado */ }
  };

  updateCount();
  _syncCountInterval = setInterval(updateCount, 5_000);

  // Actualizar inmediatamente cuando syncEngine encola o termina
  syncEngine.on('enqueue',          updateCount);
  syncEngine.on('pendingCountChange', ({ count }) => { window.__pendingCount = count; });

  // ── beforeunload (Web / PWA / Electron renderer) ──────────────────────────
  _beforeUnloadHandler = (e) => {
    if (window.__pendingCount > 0) {
      e.preventDefault();
      // Algunos navegadores requieren returnValue para mostrar el diálogo
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', _beforeUnloadHandler);

  // ── Capacitor backButton (Android) ────────────────────────────────────────
  _initCapacitorLock();
}

async function _initCapacitorLock() {
  try {
    const { App } = await import('@capacitor/app');

    const handler = App.addListener('backButton', async ({ canGoBack }) => {
      const count = window.__pendingCount;

      if (count > 0) {
        // Mostrar alerta nativa de Capacitor
        const { Dialog } = await import('@capacitor/dialog');
        await Dialog.alert({
          title:   'Cobros pendientes',
          message: `Hay ${count} cobro${count !== 1 ? 's' : ''} sin sincronizar.\n\nEspera a tener red o activa WiFi antes de salir.`,
        });
        return; // NO salir
      }

      // Sin pendientes: comportamiento normal
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    _capacitorUnsub = () => handler.remove();
  } catch (_) {
    // No estamos en Capacitor — ignorar
  }
}

// ─── Destroy ──────────────────────────────────────────────────────────────────

export function destroyAppLock() {
  if (!_initialized) return;
  _initialized = false;

  if (_beforeUnloadHandler) {
    window.removeEventListener('beforeunload', _beforeUnloadHandler);
    _beforeUnloadHandler = null;
  }

  if (_capacitorUnsub) {
    _capacitorUnsub();
    _capacitorUnsub = null;
  }

  if (_syncCountInterval) {
    clearInterval(_syncCountInterval);
    _syncCountInterval = null;
  }
}
