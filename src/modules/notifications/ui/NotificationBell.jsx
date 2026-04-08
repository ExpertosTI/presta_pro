import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X } from 'lucide-react';
import notificationService from '../services/notificationService';
import { formatDateTime } from '../../../shared/utils/formatters';

const NOTIFICATION_ICONS = {
    PAYMENT_DUE: '💰',
    PAYMENT_RECEIVED: '✅',
    REPORT: '📊',
    SYSTEM: '⚙️',
    SUBSCRIPTION: '💳',
    OVERDUE: '⚠️',
    LOCATION_ALERT: '📍'
};

export function NotificationBell({ onNavigateToNotifications }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const lastUnreadCountRef = useRef(0);

    const playNotificationSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) { /* sound not supported */ }
    }, []);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click/touch
    useEffect(() => {
        const handleClose = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClose);
        document.addEventListener('touchstart', handleClose, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClose);
            document.removeEventListener('touchstart', handleClose);
        };
    }, []);

    // Prevent body scroll when open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const loadNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            const newUnreadCount = data.unreadCount || 0;
            if (newUnreadCount > lastUnreadCountRef.current && lastUnreadCountRef.current !== 0) {
                playNotificationSound();
            }
            lastUnreadCountRef.current = newUnreadCount;
            setNotifications((data.notifications || []).slice(0, 8));
            setUnreadCount(newUnreadCount);
        } catch (e) {
            console.error('Error loading notifications:', e);
        }
    };

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    };

    const handleViewAll = () => {
        setIsOpen(false);
        onNavigateToNotifications?.();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Notificaciones"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Mobile: full-screen bottom sheet / Desktop: dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop - mobile only */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40 sm:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed inset-x-0 bottom-0 max-h-[80vh] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:bottom-auto sm:max-h-none sm:w-80 bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-slide-up sm:animate-fade-in safe-area-bottom">
                        {/* Drag handle - mobile only */}
                        <div className="flex justify-center pt-2 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Notificaciones</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Sin notificaciones</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 active:bg-slate-100 dark:active:bg-slate-700/50 transition-colors touch-manipulation ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3 items-start">
                                            <span className="text-xl flex-shrink-0 mt-0.5">{NOTIFICATION_ICONS[n.type] || '📌'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                                            </div>
                                            {!n.read && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                                    className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0"
                                                    title="Marcar como leída"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={handleViewAll}
                                className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 font-semibold rounded-lg active:bg-blue-50 dark:active:bg-blue-900/20 transition-colors touch-manipulation min-h-[44px]"
                            >
                                Ver todas las notificaciones →
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationBell;
