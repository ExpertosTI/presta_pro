/**
 * electron/auto-updater.cjs — Auto-actualización desde GitHub Releases
 *
 * Usa electron-updater (incluido en electron-builder) para comprobar
 * nuevas versiones automáticamente al iniciar la app y mostrar una
 * notificación al usuario cuando hay actualización disponible.
 *
 * Configuración requerida en electron-builder.json:
 *   "publish": {
 *     "provider": "github",
 *     "owner": "renace-tech",
 *     "repo": "prestapro-releases"
 *   }
 *
 * Mientras no haya repositorio de releases configurado,
 * este módulo falla silenciosamente sin romper la app.
 */

'use strict';

const { dialog, BrowserWindow } = require('electron');

module.exports = function initAutoUpdater({ mainWindow: _mainWindow }) {
  let autoUpdater;

  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (_) {
    // electron-updater no instalado todavía — continuar sin updates
    console.info('[auto-updater] electron-updater no disponible, omitiendo.');
    return;
  }

  // No auto-instalar en background — pedir confirmación al usuario
  autoUpdater.autoDownload    = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', async (info) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    const { response } = await dialog.showMessageBox(win, {
      type:    'info',
      title:   'Actualización disponible',
      message: `PrestaPro ${info.version} está disponible`,
      detail:  'Se descargará en segundo plano. Se instalará la próxima vez que reinicies la app.',
      buttons: ['Descargar ahora', 'Recordarme después'],
      defaultId: 0,
    });

    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-downloaded', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    const { response } = await dialog.showMessageBox(win, {
      type:    'info',
      title:   'Actualización lista',
      message: 'La actualización se ha descargado.',
      detail:  '¿Reiniciar ahora para instalarla?',
      buttons: ['Reiniciar e instalar', 'Después'],
      defaultId: 0,
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    // Log silencioso — no molestar al usuario con errores de updates
    console.warn('[auto-updater] Error comprobando actualizaciones:', err.message);
  });

  // Comprobar al iniciar con un delay para no bloquear el startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* ignorar */ });
  }, 10_000);
};
