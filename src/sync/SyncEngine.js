/**
 * SyncEngine — Motor central de sincronización Offline-First
 *
 * Implementa el patrón WAL (Write-Ahead Log):
 *
 *   1. Usuario actúa → payload escrito en LocalDB + syncQueue (PENDING)
 *   2. SyncEngine.processQueue() corre en background
 *   3. POST /api/sync/batch → servidor confirma con UUID
 *   4. Item pasa a DONE (nunca se borra hasta confirmación)
 *   5. En error → backoff exponencial, retry ilimitado
 *
 * Triggers de procesamiento:
 *   - Polling cada POLL_INTERVAL_MS (10 segundos)
 *   - Al detectar reconexión (evento 'reconnect' del NetworkMonitor)
 *   - Manual: SyncEngine.forceSync()
 *
 * Uso:
 *   import { syncEngine } from './sync';
 *   await syncEngine.init();
 *   syncEngine.start();
 *
 *   // Encolar un cobro:
 *   await syncEngine.enqueue('receipt', 'CREATE', receiptObject);
 */

import db from './db/LocalDB.js';
import syncQueue from './SyncQueue.js';
import networkMonitor from './NetworkMonitor.js';
import conflictResolver, { RESOLUTION } from './ConflictResolver.js';

const POLL_INTERVAL_MS   = 10_000;  // 10 segundos
const BATCH_SIZE         = 20;      // items por batch al servidor
const API_TIMEOUT_MS     = 15_000;  // timeout por request de sync

// ─── SyncEngine ───────────────────────────────────────────────────────────────

class SyncEngine {
  constructor() {
    this._pollTimer      = null;
    this._running        = false;
    this._processing     = false;
    this._apiBaseUrl     = null;
    this._getAuthToken   = null;
    this._listeners      = {};
    this._stats = {
      totalSynced:  0,
      totalErrors:  0,
      lastSyncAt:   null,
    };
  }

  get isRunning()    { return this._running; }
  get stats()        { return { ...this._stats }; }

  /**
   * Inicializa la BD local. Debe llamarse antes de start().
   * @param {object} options
   * @param {string}   options.apiBaseUrl     - URL base del servidor (sin /api/sync/batch)
   * @param {Function} options.getAuthToken   - Función que devuelve el JWT token actual
   * @param {string}  [options.heartbeatUrl]  - URL para heartbeat (opcional)
   */
  async init({ apiBaseUrl, getAuthToken, heartbeatUrl = null } = {}) {
    this._apiBaseUrl   = apiBaseUrl   || import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    this._getAuthToken = getAuthToken || (() => localStorage.getItem('authToken'));

    await db.init();

    networkMonitor.start(heartbeatUrl || this._buildHeartbeatUrl());

    // Procesar queue al reconectar
    networkMonitor.on('reconnect', () => {
      console.info('[SyncEngine] Reconexión detectada — procesando cola.');
      this.processQueue();
    });

    console.info('[SyncEngine] Inicializado ✓');
  }

  /**
   * Arranca el polling automático.
   */
  start() {
    if (this._running) return;
    this._running = true;

    this._pollTimer = setInterval(() => {
      if (networkMonitor.isOnline) {
        this.processQueue();
      }
    }, POLL_INTERVAL_MS);

    // Procesar inmediatamente si hay pendientes y hay red
    if (networkMonitor.isOnline) {
      this.processQueue();
    }

    console.info('[SyncEngine] Polling iniciado (cada', POLL_INTERVAL_MS / 1000, 's)');
  }

  /**
   * Detiene el polling.
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    networkMonitor.stop();
  }

  // ── API pública para enqueue ─────────────────────────────────────────────

  /**
   * Encola una operación y la guarda en LocalDB.
   * Este es el punto de entrada para TODO cambio de datos.
   *
   * @param {string} entity    - Ver ENTITIES
   * @param {string} operation - Ver OPERATIONS
   * @param {object} payload   - Objeto de datos completo (con id, updated_at, etc.)
   * @returns {Promise<string>} UUID del item encolado
   */
  async enqueue(entity, operation, payload) {
    const uuid = await syncQueue.enqueue(entity, operation, payload);
    this._emit('enqueue', { uuid, entity, operation });

    // Exponer el count para el lock de Electron/Capacitor
    this._updateGlobalPendingCount();

    return uuid;
  }

  /**
   * Fuerza procesamiento inmediato de la cola (útil para el botón "Sincronizar ahora").
   */
  async forceSync() {
    if (!networkMonitor.isOnline) {
      console.warn('[SyncEngine] Sin conexión — forzar sync ignorado.');
      return { synced: 0, errors: 0 };
    }
    return this.processQueue();
  }

  // ── Procesamiento de la cola ─────────────────────────────────────────────

  /**
   * Procesa todos los items PENDING + ERROR-retryable en batches.
   * Mutex simple: si ya está procesando, no solapar.
   */
  async processQueue() {
    if (this._processing) return;
    this._processing = true;

    let totalSynced = 0;
    let totalErrors = 0;

    try {
      // Pending primero, luego retryables
      const [pending, retryable] = await Promise.all([
        syncQueue.getPending(),
        syncQueue.getRetryable(),
      ]);

      const items = this._deduplicateById([...pending, ...retryable]);

      if (items.length === 0) {
        this._processing = false;
        return { synced: 0, errors: 0 };
      }

      this._emit('syncStart', { count: items.length });

      // Procesar en batches
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const { synced, errors } = await this._processBatch(batch);
        totalSynced += synced;
        totalErrors += errors;
      }

      this._stats.totalSynced += totalSynced;
      this._stats.totalErrors += totalErrors;
      this._stats.lastSyncAt   = new Date().toISOString();

      this._emit('syncEnd', { synced: totalSynced, errors: totalErrors });
      this._updateGlobalPendingCount();

    } catch (err) {
      console.error('[SyncEngine] Error procesando cola:', err);
      this._emit('syncError', { error: err.message });
    } finally {
      this._processing = false;
    }

    return { synced: totalSynced, errors: totalErrors };
  }

  /**
   * Envía un batch de items al servidor y procesa las respuestas.
   */
  async _processBatch(items) {
    let synced = 0;
    let errors = 0;

    // Marcar todos como SYNCING
    await Promise.all(items.map((item) => syncQueue.markSyncing(item.id)));

    try {
      const operations = items.map((item) => ({
        id:        item.id,          // UUID idempotency key
        entity:    item.entity,
        operation: item.operation,
        payload:   JSON.parse(item.payload),
        created_at: item.created_at,
      }));

      const serverResp = await this._postBatch(operations);
      const resolutions = conflictResolver.processBatchResponse(items, serverResp);

      for (const res of resolutions) {
        if (
          res.resolution === RESOLUTION.LOCAL_WINS ||
          res.resolution === RESOLUTION.ALREADY_DONE ||
          res.resolution === RESOLUTION.MERGED
        ) {
          await syncQueue.markDone(res.queueId);

          // Si hay un objeto ganador merged, actualizamos la tabla local
          if (res.resolution === RESOLUTION.MERGED && res.winner) {
            await this._applyServerWinner(res.winner, items.find(i => i.id === res.queueId));
          }

          synced++;
        } else if (res.resolution === RESOLUTION.SERVER_WINS) {
          // Descartar cambio local, aplicar versión del servidor
          await syncQueue.markDone(res.queueId);
          await this._applyServerWinner(res.winner, items.find(i => i.id === res.queueId));

          // Notificar al UI que su cambio fue rechazado
          this._emit('conflictResolved', {
            queueId:  res.queueId,
            winner:   'server',
            conflicts: res.conflicts,
          });
          synced++;
        } else {
          // MANUAL_NEEDED o error
          await syncQueue.markError(res.queueId, res.error || 'Resolución manual requerida');
          errors++;
        }
      }
    } catch (err) {
      // Error de red o servidor — marcar todos como ERROR con backoff
      const errorMsg = err.message || 'Error al enviar al servidor';
      await Promise.all(items.map((item) => syncQueue.markError(item.id, errorMsg)));
      errors += items.length;
      console.warn(`[SyncEngine] Batch fallido (${items.length} items):`, errorMsg);
    }

    return { synced, errors };
  }

  /**
   * POST /api/sync/batch
   */
  async _postBatch(operations) {
    const token = this._getAuthToken?.();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const res = await fetch(`${this._apiBaseUrl}/sync/batch`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body:   JSON.stringify({ operations }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Aplica la versión ganadora del servidor a la tabla local correspondiente.
   */
  async _applyServerWinner(winner, queueItem) {
    if (!winner || !queueItem) return;
    try {
      const tableMap = {
        receipt:       'receipts',
        loan:          'loans',
        client:        'clients',
        expense:       'expenses',
        route_closing: 'route_closings',
      };
      const table = tableMap[queueItem.entity];
      if (table) {
        await db.upsert(table, { ...winner, synced: 1 });
      }
    } catch (err) {
      console.warn('[SyncEngine] Error aplicando winner del servidor:', err);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Elimina duplicados por id de queue (evita procesar el mismo item dos veces
   * si aparece en pending Y en retryable).
   */
  _deduplicateById(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Expone el count de pendientes en window.__pendingCount para el lock de Electron.
   */
  async _updateGlobalPendingCount() {
    try {
      const count = await syncQueue.getPendingCount();
      if (typeof window !== 'undefined') {
        window.__pendingCount = count;
      }
      this._emit('pendingCountChange', { count });
    } catch (_) { /* ignorar */ }
  }

  _buildHeartbeatUrl() {
    if (!this._apiBaseUrl) return '/health';
    if (/\/api\/?$/.test(this._apiBaseUrl)) {
      return `${this._apiBaseUrl.replace(/\/api\/?$/, '')}/health`;
    }
    return `${this._apiBaseUrl.replace(/\/$/, '')}/health`;
  }

  // ── Event emitter ────────────────────────────────────────────────────────

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => {
      try { fn(data); } catch (_) { /* no propagar */ }
    });
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;

// Re-exportar constantes para conveniencia
export { ENTITIES, OPERATIONS } from './SyncQueue.js';
