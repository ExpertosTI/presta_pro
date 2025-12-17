const { contextBridge, ipcRenderer } = require('electron');

// ============================================
// RenKredit Desktop - Preload Script
// Secure bridge between main and renderer
// ============================================

contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================
    // 1. DIRECT PRINTING
    // ============================================
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    printSilent: (html, printerName) => ipcRenderer.invoke('print-silent', { html, printerName }),

    // ============================================
    // 5. NOTIFICATIONS
    // ============================================
    showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
    alertPendingPayments: (count, total) => ipcRenderer.send('pending-payments-alert', { count, total }),

    // ============================================
    // 6. AUTO-START
    // ============================================
    getAutoLaunch: () => ipcRenderer.invoke('auto-launch-get'),
    setAutoLaunch: (enable) => ipcRenderer.invoke('auto-launch-set', enable),

    // ============================================
    // 8 & 10. OFFLINE & SYNC
    // ============================================
    getLastSync: () => ipcRenderer.invoke('get-last-sync'),
    setLastSync: (data) => ipcRenderer.invoke('set-last-sync', data),

    // ============================================
    // NAVIGATION (from tray menu)
    // ============================================
    onNavigate: (callback) => ipcRenderer.on('navigate', (event, tab) => callback(tab)),
    onSyncNow: (callback) => ipcRenderer.on('sync-now', () => callback()),

    // ============================================
    // APP INFO
    // ============================================
    isElectron: true,
    platform: process.platform,
});

console.log('RenKredit preload script loaded');
