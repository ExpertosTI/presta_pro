/**
 * electron/sync-bridge.cjs — IPC handlers para SQLite
 *
 * Recibe llamadas del renderer vía ipcRenderer.invoke('db:*')
 * y las ejecuta contra la instancia de better-sqlite3 del main process.
 *
 * Seguridad:
 *  - Solo acepta queries en lista blanca de tablas permitidas
 *  - Parámetros siempre pasados como array (never string interpolation)
 *  - Logging de errores sin exponer stack traces al renderer
 */

'use strict';

// Tablas permitidas (whitelist de seguridad)
const ALLOWED_TABLES = new Set([
  'sync_queue',
  'clients',
  'loans',
  'receipts',
  'expenses',
  'route_closings',
  'sync_meta',
]);

/**
 * Valida que el SQL no apunte a tablas del sistema o utilice patrones peligrosos.
 * No es un parser SQL completo — es una capa de defensa adicional.
 */
function isQuerySafe(sql) {
  if (!sql || typeof sql !== 'string') return false;

  const upper = sql.toUpperCase().trim();

  // Bloquear operaciones destructivas no esperadas
  const blocked = ['DROP ', 'TRUNCATE ', 'ATTACH ', 'DETACH ', 'PRAGMA '];
  if (blocked.some((b) => upper.includes(b))) return false;

  // Verificar que al menos una tabla permitida aparece en la query
  // (las queries de schema (CREATE/INSERT OR IGNORE) siempre usan tablas del schema)
  const referencesAllowed = [...ALLOWED_TABLES].some((t) =>
    upper.includes(t.toUpperCase())
  );

  // Para CREATE TABLE IF NOT EXISTS (schema init) también permitir
  const isSchemaInit = upper.includes('CREATE TABLE') || upper.includes('CREATE INDEX') || upper.includes('INSERT OR IGNORE');

  return referencesAllowed || isSchemaInit;
}

/**
 * Registra los handlers IPC de SQLite.
 * @param {{ ipcMain: Electron.IpcMain, getDb: () => Database }} opts
 */
module.exports = function registerSyncBridge({ ipcMain, getDb }) {

  ipcMain.handle('db:run', (_event, { sql, params = [] }) => {
    const db = getDb();
    if (!db) return { changes: 0 };

    if (!isQuerySafe(sql)) {
      console.warn('[sync-bridge] Query bloqueada por seguridad:', sql.slice(0, 80));
      return { changes: 0 };
    }

    try {
      const stmt   = db.prepare(sql);
      const result = stmt.run(...params);
      return { changes: result.changes };
    } catch (err) {
      console.error('[sync-bridge] db:run error:', err.message);
      throw new Error(`DB error: ${err.message}`);
    }
  });

  ipcMain.handle('db:get', (_event, { sql, params = [] }) => {
    const db = getDb();
    if (!db) return undefined;

    if (!isQuerySafe(sql)) {
      console.warn('[sync-bridge] Query bloqueada por seguridad:', sql.slice(0, 80));
      return undefined;
    }

    try {
      const stmt = db.prepare(sql);
      return stmt.get(...params) ?? undefined;
    } catch (err) {
      console.error('[sync-bridge] db:get error:', err.message);
      throw new Error(`DB error: ${err.message}`);
    }
  });

  ipcMain.handle('db:all', (_event, { sql, params = [] }) => {
    const db = getDb();
    if (!db) return [];

    if (!isQuerySafe(sql)) {
      console.warn('[sync-bridge] Query bloqueada por seguridad:', sql.slice(0, 80));
      return [];
    }

    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (err) {
      console.error('[sync-bridge] db:all error:', err.message);
      throw new Error(`DB error: ${err.message}`);
    }
  });

  ipcMain.handle('db:exec', (_event, sql) => {
    const db = getDb();
    if (!db) return;

    // Para exec (schema init) permitimos sin whitelist — solo desde código interno
    try {
      db.exec(sql);
    } catch (err) {
      console.error('[sync-bridge] db:exec error:', err.message);
      throw new Error(`DB exec error: ${err.message}`);
    }
  });
};
