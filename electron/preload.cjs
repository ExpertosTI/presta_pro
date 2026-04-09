/**
 * electron/preload.cjs — Contexto bridge entre main y renderer
 *
 * Expone en window.__ELECTRON_IPC__ solo los métodos necesarios,
 * manteniendo contextIsolation=true para seguridad.
 *
 * El renderer (React) detecta window.__ELECTRON_IPC__ para saber
 * que está corriendo en Electron y usar el driver ElectronDriver de LocalDB.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__ELECTRON_IPC__', {
  /**
   * Ejecuta una sentencia SQL que no devuelve filas (INSERT/UPDATE/DELETE/CREATE).
   * @param {string} sql
   * @param {any[]}  params
   * @returns {Promise<{ changes: number }>}
   */
  run: (sql, params = []) =>
    ipcRenderer.invoke('db:run', { sql, params }),

  /**
   * Ejecuta una query y devuelve la primera fila.
   * @returns {Promise<object|undefined>}
   */
  get: (sql, params = []) =>
    ipcRenderer.invoke('db:get', { sql, params }),

  /**
   * Ejecuta una query y devuelve todas las filas.
   * @returns {Promise<object[]>}
   */
  all: (sql, params = []) =>
    ipcRenderer.invoke('db:all', { sql, params }),

  /**
   * Ejecuta múltiples sentencias SQL separadas por ';' (schema migrations).
   * @returns {Promise<void>}
   */
  exec: (sql) =>
    ipcRenderer.invoke('db:exec', sql),

  /**
   * Información de la plataforma.
   */
  platform: process.platform,
  version:  process.env.npm_package_version || '0.0.0',
});
