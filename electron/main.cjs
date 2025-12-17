const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// ============================================
// RenKredit Desktop App - Native Features
// ============================================
// 1. Direct Printing
// 4. System Tray
// 5. Windows Notifications
// 6. Auto-Start
// 8. Offline Mode (via preload)
// 10. Background Sync (via preload)
// ============================================

let mainWindow = null;
let tray = null;
let isQuitting = false;

// App paths
const iconPath = path.join(__dirname, '..', 'favicon.ico');
const userDataPath = app.getPath('userData');

// ============================================
// 6. AUTO-START CONFIGURATION
// ============================================
const AutoLaunch = require('auto-launch') || null;
let autoLauncher = null;

function setupAutoLaunch() {
    try {
        if (!AutoLaunch) {
            console.log('Auto-launch not available');
            return;
        }
        autoLauncher = new AutoLaunch({
            name: 'RenKredit',
            path: app.getPath('exe'),
        });
    } catch (err) {
        console.log('Auto-launch setup error:', err.message);
    }
}

// ============================================
// 4. SYSTEM TRAY
// ============================================
function createTray() {
    try {
        const icon = nativeImage.createFromPath(iconPath);
        tray = new Tray(icon.resize({ width: 16, height: 16 }));

        const contextMenu = Menu.buildFromTemplate([
            { label: 'Abrir RenKredit', click: () => mainWindow?.show() },
            { type: 'separator' },
            {
                label: 'Nuevo Préstamo', click: () => {
                    mainWindow?.show();
                    mainWindow?.webContents.send('navigate', 'loans');
                }
            },
            {
                label: 'Cobrar Pagos', click: () => {
                    mainWindow?.show();
                    mainWindow?.webContents.send('navigate', 'routes');
                }
            },
            { type: 'separator' },
            {
                label: 'Sincronizar Ahora', click: () => {
                    mainWindow?.webContents.send('sync-now');
                }
            },
            { type: 'separator' },
            {
                label: 'Cerrar', click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('RenKredit - Sistema de Préstamos');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            mainWindow?.show();
        });

        console.log('System tray created');
    } catch (err) {
        console.log('Tray error:', err.message);
    }
}

// ============================================
// MAIN WINDOW
// ============================================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        icon: iconPath,
        title: 'RenKredit',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false, // Show when ready
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();

            // 5. Show notification that app is minimized
            showNotification('RenKredit minimizado', 'La aplicación sigue ejecutándose en la bandeja del sistema.');
        }
    });
}

// ============================================
// 5. WINDOWS NOTIFICATIONS
// ============================================
function showNotification(title, body, onClick = null) {
    if (!Notification.isSupported()) {
        console.log('Notifications not supported');
        return;
    }

    const notification = new Notification({
        title,
        body,
        icon: iconPath,
        silent: false,
    });

    if (onClick) {
        notification.on('click', onClick);
    }

    notification.show();
}

// IPC: Show notification from renderer
ipcMain.on('show-notification', (event, { title, body }) => {
    showNotification(title, body, () => {
        mainWindow?.show();
    });
});

// IPC: Pending payments notification
ipcMain.on('pending-payments-alert', (event, { count, total }) => {
    showNotification(
        `${count} pagos pendientes hoy`,
        `Total a cobrar: RD$${total.toLocaleString()}`,
        () => {
            mainWindow?.show();
            mainWindow?.webContents.send('navigate', 'routes');
        }
    );
});

// ============================================
// 1. DIRECT PRINTING
// ============================================
ipcMain.handle('get-printers', async () => {
    try {
        const printers = await mainWindow?.webContents.getPrintersAsync();
        return printers || [];
    } catch (err) {
        console.error('Error getting printers:', err);
        return [];
    }
});

ipcMain.handle('print-silent', async (event, { html, printerName }) => {
    try {
        // Create hidden window for printing
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        const options = {
            silent: true,
            printBackground: true,
            deviceName: printerName || '',
            margins: { marginType: 'none' },
        };

        const success = await printWindow.webContents.print(options);
        printWindow.close();

        return { success };
    } catch (err) {
        console.error('Print error:', err);
        return { success: false, error: err.message };
    }
});

// ============================================
// 6. AUTO-START HANDLERS
// ============================================
ipcMain.handle('auto-launch-get', async () => {
    try {
        if (!autoLauncher) return false;
        return await autoLauncher.isEnabled();
    } catch {
        return false;
    }
});

ipcMain.handle('auto-launch-set', async (event, enable) => {
    try {
        if (!autoLauncher) return false;
        if (enable) {
            await autoLauncher.enable();
        } else {
            await autoLauncher.disable();
        }
        return true;
    } catch (err) {
        console.error('Auto-launch error:', err);
        return false;
    }
});

// ============================================
// 8 & 10. OFFLINE/SYNC - Store last sync time
// ============================================
ipcMain.handle('get-last-sync', () => {
    const syncFile = path.join(userDataPath, 'last-sync.json');
    try {
        if (fs.existsSync(syncFile)) {
            return JSON.parse(fs.readFileSync(syncFile, 'utf8'));
        }
    } catch { }
    return null;
});

ipcMain.handle('set-last-sync', (event, data) => {
    const syncFile = path.join(userDataPath, 'last-sync.json');
    try {
        fs.writeFileSync(syncFile, JSON.stringify(data));
        return true;
    } catch {
        return false;
    }
});

// ============================================
// APP LIFECYCLE
// ============================================
app.whenReady().then(() => {
    setupAutoLaunch();
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, stay in tray
    }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

console.log('RenKredit Desktop starting...');
