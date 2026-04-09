/**
 * electron/main.cjs — Proceso principal de Electron
 *
 * Responsabilidades:
 *  - Abrir la ventana principal (carga dist/index.html)
 *  - Manejar SQLite local via better-sqlite3 (expuesto al renderer con IPC)
 *  - Lock before-quit: bloquea el cierre si hay cobros pendientes en sync_queue
 *  - Menú nativo (File / Edit / View / Help)
 *  - Delegar auto-updates al módulo auto-updater
 *
 * Nota: Usa .cjs porque el package.json tiene "type": "module"
 * pero Electron main process requiere CommonJS.
 */

'use strict';

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

// ─── Rutas ───────────────────────────────────────────────────────────────────

const isDev     = !app.isPackaged;
const _ROOT_DIR  = isDev ? path.join(__dirname, '..') : path.dirname(app.getPath('exe')); // eslint-disable-line no-unused-vars
const DIST_DIR  = path.join(__dirname, '..', 'dist');
const DB_PATH   = path.join(app.getPath('userData'), 'prestapro.db');

// ─── SQLite setup ─────────────────────────────────────────────────────────────

let db = null;

function initSQLite() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH, { verbose: isDev ? console.log : null });

    // WAL mode — mayor velocidad y tolerancia a crashes
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    // Leer y ejecutar el schema
    const schemaPath = path.join(__dirname, '..', 'src', 'sync', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
    }

    console.log('[main] SQLite inicializado en:', DB_PATH);
  } catch (err) {
    console.error('[main] Error iniciando SQLite:', err.message);
    // La app sigue funcionando sin SQLite (fallback a IndexedDB del renderer)
  }
}

// ─── Ventana principal ────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:          1280,
    height:         800,
    minWidth:       900,
    minHeight:      600,
    title:          'PrestaPro',
    icon:           path.join(__dirname, '..', 'favicon.ico'),
    backgroundColor: '#0f172a',  // slate-900 — evita flash blanco al cargar
    show:           false,       // mostrar solo cuando esté lista la carga
    webPreferences: {
      preload:           path.join(__dirname, 'preload.cjs'),
      contextIsolation:  true,   // seguridad: renderer no accede a Node directamente
      nodeIntegration:   false,
      sandbox:           false,  // necesario para que preload use require
    },
  });

  // Cargar la app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(DIST_DIR, 'index.html'));
  }

  // Mostrar cuando esté lista
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Lock before-quit ─────────────────────────────────────────────────────────

let isForceQuit = false;

app.on('before-quit', async (e) => {
  if (isForceQuit) return; // ya confirmado por el usuario

  if (!mainWindow) return;

  // Leer el count de pendientes que el renderer mantiene en window.__pendingCount
  let pendingCount = 0;
  try {
    pendingCount = await mainWindow.webContents.executeJavaScript(
      'window.__pendingCount || 0',
      true
    );
  } catch (_) { /* renderer no disponible */ }

  if (pendingCount <= 0) return; // nada pendiente, salir normalmente

  e.preventDefault(); // cancelar el quit

  const { response } = await dialog.showMessageBox(mainWindow, {
    type:    'warning',
    title:   'Cobros pendientes de sincronizar',
    message: `Hay ${pendingCount} cobro${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de sincronizar.`,
    detail:  'Si sales ahora podrías perder datos. Espera a que se sincronicen o activa WiFi antes de cerrar.',
    buttons: ['Esperar sincronización', 'Salir de todas formas'],
    defaultId: 0,
    cancelId:  0,
    icon:    path.join(__dirname, '..', 'favicon.ico'),
  });

  if (response === 1) {
    // Usuario eligió salir igual
    isForceQuit = true;
    app.quit();
  }
  // Si response === 0, el quit fue cancelado, la app sigue abierta
});

// ─── IPC handlers — bridge SQLite ─────────────────────────────────────────────

require('./sync-bridge.cjs')({ ipcMain, getDb: () => db });

// ─── Menú nativo ──────────────────────────────────────────────────────────────

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Sincronizar ahora',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.executeJavaScript(
            'window.__forceSync && window.__forceSync()'
          ),
        },
        { type: 'separator' },
        {
          label: 'Abrir carpeta de datos',
          click: () => shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Salir' },
      ],
    },
    { role: 'editMenu', label: 'Editar' },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Sitio web',
          click: () => shell.openExternal('https://renace.tech'),
        },
        {
          label: 'Versión',
          click: () => dialog.showMessageBox(mainWindow, {
            type:    'info',
            title:   'PrestaPro',
            message: `Versión ${app.getVersion()}`,
            detail:  'Renace Tech © 2026',
          }),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initSQLite();
  buildMenu();
  createWindow();

  // Iniciar auto-updater (solo en producción)
  if (!isDev) {
    try {
      require('./auto-updater.cjs')({ mainWindow });
    } catch (_) { /* no auto-updater disponible */ }
  }

  app.on('activate', () => {
    // macOS: reabrir ventana al hacer click en el dock
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
