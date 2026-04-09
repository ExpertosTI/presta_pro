/**
 * LocalDB — Abstracción de base de datos local
 *
 * Detecta la plataforma y usa el driver apropiado:
 *  - Android (Capacitor)  → @capacitor-community/sqlite
 *  - Electron (desktop)   → better-sqlite3 via IPC bridge
 *  - Web / PWA            → IndexedDB (fallback sin dependencias externas)
 *
 * La API pública es la misma para todas las plataformas:
 *   await db.run(sql, params?)        → { changes }
 *   await db.get(sql, params?)        → row | undefined
 *   await db.all(sql, params?)        → row[]
 *   await db.exec(sqlMultiStatement)  → void
 */

import schemaSQL from './schema.sql?raw';

// ─── Detección de plataforma ─────────────────────────────────────────────────

function detectPlatform() {
  if (typeof window !== 'undefined' && window.__ELECTRON_IPC__) return 'electron';
  try {
    // Capacitor expone Capacitor.getPlatform() como 'android' | 'ios' | 'web'
    const { Capacitor } = window;
    if (Capacitor && Capacitor.getPlatform() !== 'web') return 'capacitor';
  } catch (_) { /* no Capacitor */ }
  return 'web';
}

// ─── Driver IndexedDB (fallback web/PWA) ─────────────────────────────────────

class IndexedDBDriver {
  constructor() {
    this._db = null;
    this._stores = ['sync_queue', 'clients', 'loans', 'receipts', 'expenses', 'route_closings', 'sync_meta'];
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('prestapro_local', 1);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        this._stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            // Índices comunes
            if (['clients', 'loans', 'receipts', 'expenses', 'route_closings'].includes(storeName)) {
              store.createIndex('by_tenant', 'tenant_id', { unique: false });
              store.createIndex('by_synced', 'synced', { unique: false });
            }
            if (storeName === 'sync_queue') {
              store.createIndex('by_status', 'status', { unique: false });
            }
            if (storeName === 'sync_meta') {
              // keyPath será 'entity'
            }
          }
        });

        // seed sync_meta
        const metaTx = e.target.transaction;
        const metaStore = metaTx.objectStore('sync_meta');
        ['clients', 'loans', 'receipts', 'expenses', 'route_closings'].forEach((entity) => {
          metaStore.put({ id: entity, entity, last_pull_at: null, last_push_at: null });
        });
      };

      req.onsuccess = (e) => { this._db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Mapea SQL simple a operaciones IDB. Solo soporta los patrones usados internamente.
  async run(sql, params = []) {
    const meta = this._parseSql(sql, params);
    return this._idbRun(meta);
  }

  async get(sql, params = []) {
    const rows = await this.all(sql, params);
    return rows[0];
  }

  async all(sql, params = []) {
    const meta = this._parseSql(sql, params);
    return this._idbAll(meta);
  }

  async exec(_sql) {
    // Para el schema SQL completo se ignora en IDB (estructura creada en onupgradeneeded)
    return;
  }

  // ── Parser SQL minimal ────────────────────────────────────────────────────

  _parseSql(sql, params) {
    const s = sql.trim().toUpperCase();
    const tableName = this._extractTable(sql);

    if (s.startsWith('INSERT OR REPLACE') || s.startsWith('INSERT')) {
      // Extraemos columnas y valores del SQL o usamos el objeto directo
      return { op: 'put', table: tableName, params };
    }
    if (s.startsWith('UPDATE')) {
      return { op: 'update', table: tableName, sql, params };
    }
    if (s.startsWith('DELETE')) {
      return { op: 'delete', table: tableName, sql, params };
    }
    if (s.startsWith('SELECT')) {
      return { op: 'select', table: tableName, sql, params };
    }
    return { op: 'unknown', table: tableName, sql, params };
  }

  _extractTable(sql) {
    const m = sql.match(/(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  _store(name, mode = 'readonly') {
    const tx = this._db.transaction([name], mode);
    return { tx, store: tx.objectStore(name) };
  }

  async _idbAll({ op, table, sql, params }) {
    return new Promise((resolve, reject) => {
      const { store } = this._store(table);

      if (op === 'select') {
        // SELECT con WHERE id = ?
        const idMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
        if (idMatch && params.length > 0) {
          const req = store.get(params[0]);
          req.onsuccess = () => resolve(req.result ? [req.result] : []);
          req.onerror = (e) => reject(e.target.error);
          return;
        }

        // SELECT con WHERE status = ? (sync_queue)
        const statusMatch = sql.match(/WHERE\s+status\s*=\s*\?/i);
        if (statusMatch && params.length > 0) {
          try {
            const idx = store.index('by_status');
            const req = idx.getAll(params[0]);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e.target.error);
          } catch (_) {
            const req = store.getAll();
            req.onsuccess = () => resolve((req.result || []).filter(r => r.status === params[0]));
            req.onerror = (e) => reject(e.target.error);
          }
          return;
        }

        // SELECT con WHERE synced = ?
        const syncedMatch = sql.match(/WHERE\s+synced\s*=\s*\?/i);
        if (syncedMatch && params.length > 0) {
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result || []).filter(r => r.synced === params[0]));
          req.onerror = (e) => reject(e.target.error);
          return;
        }

        // Full table scan
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
        return;
      }

      resolve([]);
    });
  }

  async _idbRun({ op, table, sql, params }) {
    return new Promise((resolve, reject) => {
      if (op === 'put') {
        // params[0] es el objeto a guardar directamente
        const obj = params[0];
        if (!obj) { resolve({ changes: 0 }); return; }
        const { tx, store } = this._store(table, 'readwrite');
        const req = store.put(obj);
        req.onsuccess = () => resolve({ changes: 1 });
        tx.onerror = (e) => reject(e.target.error);
        return;
      }

      if (op === 'update') {
        // UPDATE table SET col=? WHERE id=?  → params=[val, id]
        const { tx, store } = this._store(table, 'readwrite');
        const id = params[params.length - 1];
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const row = getReq.result;
          if (!row) { resolve({ changes: 0 }); return; }
          // Aplicar el update parseando las columnas del SET
          const setMatch = sql.match(/SET\s+(.+)\s+WHERE/i);
          if (setMatch) {
            const cols = setMatch[1].split(',').map(c => c.trim().replace(/\s*=\s*\?/, ''));
            cols.forEach((col, i) => { row[col] = params[i]; });
          }
          const putReq = store.put(row);
          putReq.onsuccess = () => resolve({ changes: 1 });
          tx.onerror = (e) => reject(e.target.error);
        };
        getReq.onerror = (e) => reject(e.target.error);
        return;
      }

      if (op === 'delete') {
        const idMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
        if (idMatch && params.length > 0) {
          const { tx, store } = this._store(table, 'readwrite');
          const req = store.delete(params[0]);
          req.onsuccess = () => resolve({ changes: 1 });
          tx.onerror = (e) => reject(e.target.error);
          return;
        }
        resolve({ changes: 0 });
        return;
      }

      resolve({ changes: 0 });
    });
  }
}

// ─── Driver Electron (IPC → better-sqlite3 en main process) ──────────────────

class ElectronDriver {
  async init() {
    // El main process ya tiene la DB abierta, solo verificamos el bridge
    if (!window.__ELECTRON_IPC__) throw new Error('Electron IPC bridge no disponible');
    await window.__ELECTRON_IPC__.invoke('db:exec', schemaSQL);
  }

  async run(sql, params = []) {
    return window.__ELECTRON_IPC__.invoke('db:run', { sql, params });
  }

  async get(sql, params = []) {
    return window.__ELECTRON_IPC__.invoke('db:get', { sql, params });
  }

  async all(sql, params = []) {
    return window.__ELECTRON_IPC__.invoke('db:all', { sql, params });
  }

  async exec(sql) {
    return window.__ELECTRON_IPC__.invoke('db:exec', sql);
  }
}

// ─── Driver Capacitor (Android / iOS) ────────────────────────────────────────

class CapacitorSQLiteDriver {
  constructor() {
    this._db = null;
    this._dbName = 'prestapro';
  }

  async init() {
    const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
    const sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    const isConn = (await sqliteConnection.checkConnectionsConsistency()).result;
    const isOpen = (await sqliteConnection.isConnection(this._dbName, false)).result;

    if (isConn && isOpen) {
      this._db = await sqliteConnection.retrieveConnection(this._dbName, false);
    } else {
      this._db = await sqliteConnection.createConnection(
        this._dbName, false, 'no-encryption', 1, false
      );
    }

    await this._db.open();
    await this._db.execute(schemaSQL);
  }

  async run(sql, params = []) {
    const res = await this._db.run(sql, params);
    return { changes: res.changes?.changes ?? 0 };
  }

  async get(sql, params = []) {
    const res = await this._db.query(sql, params);
    return res.values?.[0];
  }

  async all(sql, params = []) {
    const res = await this._db.query(sql, params);
    return res.values ?? [];
  }

  async exec(sql) {
    await this._db.execute(sql);
  }
}

// ─── Singleton LocalDB ────────────────────────────────────────────────────────

class LocalDB {
  constructor() {
    this._driver = null;
    this._ready = false;
    this._platform = detectPlatform();
  }

  get platform() { return this._platform; }

  async init() {
    if (this._ready) return;

    switch (this._platform) {
      case 'electron':
        this._driver = new ElectronDriver();
        break;
      case 'capacitor':
        this._driver = new CapacitorSQLiteDriver();
        break;
      default:
        this._driver = new IndexedDBDriver();
    }

    await this._driver.init();
    this._ready = true;
    console.info(`[LocalDB] Inicializado con driver: ${this._platform}`);
  }

  _assertReady() {
    if (!this._ready) throw new Error('[LocalDB] No inicializado. Llama init() primero.');
  }

  async run(sql, params = []) {
    this._assertReady();
    return this._driver.run(sql, params);
  }

  async get(sql, params = []) {
    this._assertReady();
    return this._driver.get(sql, params);
  }

  async all(sql, params = []) {
    this._assertReady();
    return this._driver.all(sql, params);
  }

  async exec(sql) {
    this._assertReady();
    return this._driver.exec(sql);
  }

  // ── Helpers de alto nivel ─────────────────────────────────────────────────

  /**
   * Guarda un objeto en una tabla. Para IndexedDB el objeto se guarda directamente.
   * Para SQL genera INSERT OR REPLACE usando el JSON serializado.
   */
  async upsert(table, obj) {
    this._assertReady();

    if (this._platform === 'web') {
      // IndexedDB: pasar objeto directamente como primer param del driver
      return this._driver._idbRun({ op: 'put', table, params: [obj] });
    }

    // SQLite: serializar a JSON en columna data + columnas indexadas
    const now = new Date().toISOString();
    const record = { ...obj, updated_at: obj.updated_at || now };
    const keys = Object.keys(record);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return this.run(sql, Object.values(record));
  }

  /**
   * Obtiene metadatos de sync para una entidad
   */
  async getSyncMeta(entity) {
    if (this._platform === 'web') {
      return this._driver._idbAll({ op: 'select', table: 'sync_meta', sql: 'SELECT * FROM sync_meta WHERE id = ?', params: [entity] }).then(r => r[0]);
    }
    return this.get('SELECT * FROM sync_meta WHERE entity = ?', [entity]);
  }

  /**
   * Actualiza el timestamp del último pull para una entidad
   */
  async updateSyncMeta(entity, field, timestamp) {
    if (this._platform === 'web') {
      const row = await this.getSyncMeta(entity) || { id: entity, entity };
      row[field] = timestamp;
      return this._driver._idbRun({ op: 'put', table: 'sync_meta', params: [row] });
    }
    return this.run(
      `UPDATE sync_meta SET ${field} = ? WHERE entity = ?`,
      [timestamp, entity]
    );
  }
}

export const db = new LocalDB();
export default db;
