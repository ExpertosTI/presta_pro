/**
 * src/sync/index.js — Barrel export del módulo de sincronización
 *
 * Importa desde aquí para acceder a todo el motor sync:
 *
 *   import { syncEngine, syncQueue, networkMonitor, db, ENTITIES, OPERATIONS } from '../sync';
 *   import SyncStatus from '../sync/SyncStatus';
 */

// Motor principal
export { syncEngine, ENTITIES, OPERATIONS } from './SyncEngine.js';

// Cola WAL
export { syncQueue, STATUS } from './SyncQueue.js';

// Monitor de red
export { networkMonitor } from './NetworkMonitor.js';

// Base de datos local
export { db } from './db/LocalDB.js';

// Resolución de conflictos
export { conflictResolver, RESOLUTION } from './ConflictResolver.js';

// Componente UI
export { default as SyncStatus } from './SyncStatus.jsx';

// Lock anti-pérdida
export { initAppLock, destroyAppLock } from './AppLock.js';
