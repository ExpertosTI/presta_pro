/**
 * RenKredit - Electron API Hook
 * Provides access to native Windows features when running in Electron
 */

// Check if running in Electron
export const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
};

// ============================================
// 1. DIRECT PRINTING
// ============================================
export const getPrinters = async () => {
    if (!isElectron()) return [];
    try {
        return await window.electronAPI.getPrinters();
    } catch (err) {
        console.error('Error getting printers:', err);
        return [];
    }
};

export const printSilent = async (html, printerName = '') => {
    if (!isElectron()) {
        // Fallback to browser print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        return { success: true };
    }

    try {
        return await window.electronAPI.printSilent(html, printerName);
    } catch (err) {
        console.error('Print error:', err);
        return { success: false, error: err.message };
    }
};

// ============================================
// 5. NOTIFICATIONS
// ============================================
export const showNotification = (title, body) => {
    if (isElectron()) {
        window.electronAPI.showNotification(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
};

export const alertPendingPayments = (count, total) => {
    if (isElectron()) {
        window.electronAPI.alertPendingPayments(count, total);
    } else {
        showNotification(`${count} pagos pendientes`, `Total: RD$${total.toLocaleString()}`);
    }
};

// ============================================
// 6. AUTO-START
// ============================================
export const getAutoLaunch = async () => {
    if (!isElectron()) return false;
    try {
        return await window.electronAPI.getAutoLaunch();
    } catch {
        return false;
    }
};

export const setAutoLaunch = async (enable) => {
    if (!isElectron()) return false;
    try {
        return await window.electronAPI.setAutoLaunch(enable);
    } catch {
        return false;
    }
};

// ============================================
// 8 & 10. OFFLINE & SYNC
// ============================================
export const getLastSync = async () => {
    if (!isElectron()) {
        const stored = localStorage.getItem('renkredit_last_sync');
        return stored ? JSON.parse(stored) : null;
    }
    try {
        return await window.electronAPI.getLastSync();
    } catch {
        return null;
    }
};

export const setLastSync = async (data) => {
    if (!isElectron()) {
        localStorage.setItem('renkredit_last_sync', JSON.stringify(data));
        return true;
    }
    try {
        return await window.electronAPI.setLastSync(data);
    } catch {
        return false;
    }
};

// ============================================
// NAVIGATION (from tray)
// ============================================
export const onNavigateFromTray = (callback) => {
    if (!isElectron()) return () => { };
    window.electronAPI.onNavigate(callback);
    return () => { }; // Cleanup function
};

export const onSyncFromTray = (callback) => {
    if (!isElectron()) return () => { };
    window.electronAPI.onSyncNow(callback);
    return () => { };
};

// Export all as default object
export default {
    isElectron,
    getPrinters,
    printSilent,
    showNotification,
    alertPendingPayments,
    getAutoLaunch,
    setAutoLaunch,
    getLastSync,
    setLastSync,
    onNavigateFromTray,
    onSyncFromTray,
};
