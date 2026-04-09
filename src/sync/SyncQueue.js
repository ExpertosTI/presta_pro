/**
 * SyncQueue — Write-Ahead Log (WAL)
 *
 * Gestiona la cola de operaciones pendientes de sincronizar.
 * Cada operación tiene un UUID único que sirve como clave de idempotencia.
 *
 * Estados del ciclo de vida:
 *   PENDING  → acabado de encolar, esperando red
 *   SYNCING  → siendo procesado en este momento
 *   DONE     → confirmado por el servidor (puede archivarse/borrarse)
 *   ERROR    → falló, será reintentado con backoff exponencial
 *
 * Regla de oro: NUNCA se borra un item hasta que el servidor confirme el UUID.
 */

import db from './db/LocalDB.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const STATUS = Object.freeze({
  PENDING:  'PENDING',
  SYNCING:  'SYNCING',
  DONE:     'DONE',
  ERROR:    'ERROR',
});

export const ENTITIES = Object.freeze({
  RECEIPT:       'receipt',
  LOAN:          'loan',
  CLIENT:        'client',
  EXPENSE:       'expense',
  ROUTE_CLOSING: 'route_closing',
});

export const OPERATIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
});

// ─── SyncQueue ────────────────────────────────────────────────────────────────

class SyncQueue {
  // ── Escritura ─────────────────────────────────────────────────────────────

  /**
   * Encola una operación. Devuelve el UUID generado.
   * @param {string} entity  - Ver ENTITIES
   * @param {string} operation - Ver OPERATIONS
   * @param {object} payload  - Objeto de datos completo
   * @returns {Promise<string>} UUID idempotency key
   */
  async enqueue(entity, operation, payload) {
    const id = this._uuid();
    const now = new Date().toISOString();

    const item = {
      id,
      entity,
      operation,
      payload: JSON.stringify(payload),
      status: STATUS.PENDING,
      retries: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    if (db.platform === 'web') {
      await db.run('INSERT', [item]);  // IndexedDB path
    } else {
      await db.run(
        `INSERT OR REPLACE INTO sync_queue
         (id, entity, operation, payload, status, retries, last_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, entity, operation, item.payload, STATUS.PENDING, 0, null, now, now]
      );
    }

    this._emit('enqueue', item);
    return id;
  }

  // ── Lectura ───────────────────────────────────────────────────────────────

  /**
   * Devuelve todos los items PENDING ordenados por created_at.
   */
  async getPending() {
    if (db.platform === 'web') {
      const rows = await db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.PENDING]);
      return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    return db.all(
      `SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC`,
      [STATUS.PENDING]
    );
  }

  /**
   * Cuenta items pendientes (PENDING + SYNCING + ERROR con retries < max).
   */
  async getPendingCount() {
    if (db.platform === 'web') {
      const [pending, syncing, error] = await Promise.all([
        db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.PENDING]),
        db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.SYNCING]),
        db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.ERROR]),
      ]);
      return pending.length + syncing.length + error.length;
    }

    const row = await db.get(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status IN (?, ?, ?)`,
      [STATUS.PENDING, STATUS.SYNCING, STATUS.ERROR]
    );
    return row?.count ?? 0;
  }

  /**
   * Devuelve items que deben reintentarse (ERROR con backoff expirado).
   * @param {number} maxRetries - Máximo de reintentos (default: 99999 = infinito)
   */
  async getRetryable(maxRetries = 99999) {
    if (db.platform === 'web') {
      const rows = await db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.ERROR]);
      const now = Date.now();
      return rows.filter((r) => {
        if (r.retries >= maxRetries) return false;
        const backoff = this._backoffMs(r.retries);
        const updatedAt = new Date(r.updated_at).getTime();
        return now - updatedAt >= backoff;
      });
    }

    const rows = await db.all(
      `SELECT * FROM sync_queue WHERE status = ? AND retries < ?`,
      [STATUS.ERROR, maxRetries]
    );
    const now = Date.now();
    return rows.filter((r) => {
      const backoff = this._backoffMs(r.retries);
      const updatedAt = new Date(r.updated_at).getTime();
      return now - updatedAt >= backoff;
    });
  }

  // ── Mutaciones de estado ─────────────────────────────────────────────────

  /**
   * Marca un item como SYNCING (en tránsito).
   */
  async markSyncing(id) {
    return this._updateStatus(id, STATUS.SYNCING);
  }

  /**
   * Marca un item como DONE (confirmado por servidor).
   * Lo elimina de la cola activa (queda en historial si se desea conservar).
   */
  async markDone(id) {
    return this._updateStatus(id, STATUS.DONE);
  }

  /**
   * Marca un item como ERROR e incrementa retries.
   * @param {string} id
   * @param {string} errorMessage
   */
  async markError(id, errorMessage = '') {
    const now = new Date().toISOString();

    if (db.platform === 'web') {
      const rows = await db.all('SELECT * FROM sync_queue WHERE id = ?', [id]);
      const item = rows[0];
      if (!item) return;
      item.status = STATUS.ERROR;
      item.retries = (item.retries || 0) + 1;
      item.last_error = errorMessage.slice(0, 500);
      item.updated_at = now;
      await db.run('INSERT', [item]); // IDB upsert
      return;
    }

    await db.run(
      `UPDATE sync_queue
       SET status = ?, retries = retries + 1, last_error = ?, updated_at = ?
       WHERE id = ?`,
      [STATUS.ERROR, errorMessage.slice(0, 500), now, id]
    );
  }

  /**
   * Reactiva un item ERROR → PENDING (forzar reintento inmediato).
   */
  async requeue(id) {
    return this._updateStatus(id, STATUS.PENDING);
  }

  /**
   * Limpia items DONE más antiguos de N días (mantenimiento).
   * @param {number} olderThanDays
   */
  async cleanup(olderThanDays = 7) {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();

    if (db.platform === 'web') {
      // IDB: no hay query por fecha fácil; hacemos scan
      const rows = await db.all('SELECT * FROM sync_queue WHERE status = ?', [STATUS.DONE]);
      const toDelete = rows.filter((r) => r.updated_at < cutoff);
      for (const r of toDelete) {
        await db.run('DELETE FROM sync_queue WHERE id = ?', [r.id]);
      }
      return toDelete.length;
    }

    const result = await db.run(
      `DELETE FROM sync_queue WHERE status = ? AND updated_at < ?`,
      [STATUS.DONE, cutoff]
    );
    return result.changes ?? 0;
  }

  /**
   * Obtiene toda la cola (para debug/UI avanzada).
   */
  async getAll() {
    if (db.platform === 'web') {
      return db.all('SELECT * FROM sync_queue', []);
    }
    return db.all('SELECT * FROM sync_queue ORDER BY created_at DESC', []);
  }

  // ── Utilidades privadas ──────────────────────────────────────────────────

  /**
   * Backoff exponencial: 2^retries segundos, máximo 5 minutos.
   */
  _backoffMs(retries) {
    const ms = Math.pow(2, Math.min(retries, 8)) * 1000; // máx 2^8 = 256s ≈ 4min
    return Math.min(ms, 300_000);
  }

  async _updateStatus(id, status) {
    const now = new Date().toISOString();

    if (db.platform === 'web') {
      const rows = await db.all('SELECT * FROM sync_queue WHERE id = ?', [id]);
      const item = rows[0];
      if (!item) return;
      item.status = status;
      item.updated_at = now;
      await db.run('INSERT', [item]);
      this._emit('statusChange', { id, status });
      return;
    }

    await db.run(
      `UPDATE sync_queue SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now, id]
    );
    this._emit('statusChange', { id, status });
  }

  _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback para entornos sin crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ── Event emitter mínimo (sin dependencias externas) ─────────────────────

  _listeners = {};

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn); // retorna unsub
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => {
      try { fn(data); } catch (_) { /* no propagar errores de listeners */ }
    });
  }
}

export const syncQueue = new SyncQueue();
export default syncQueue;
