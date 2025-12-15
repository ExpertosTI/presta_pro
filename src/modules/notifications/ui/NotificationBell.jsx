import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import notificationService from '../services/notificationService';
import { formatDateTime } from '../../../shared/utils/formatters';

const NOTIFICATION_ICONS = {
    PAYMENT_DUE: '💰',
    PAYMENT_RECEIVED: '✅',
    REPORT: '📊',
    SYSTEM: '⚙️',
    SUBSCRIPTION: '💳',
    OVERDUE: '⚠️'
};

export function NotificationBell({ onNavigateToNotifications }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const lastUnreadCountRef = useRef(0);

    // MEJORA 2: Notification sound using Web Audio API
    const playNotificationSound = () => {
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
        } catch (e) {
            console.log('Sound not supported');
        }
    };

    useEffect(() => {
        loadNotifications();
        // Poll for new notifications every 60 seconds
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            const newUnreadCount = data.unreadCount || 0;

            // Play sound if new notifications arrived
            if (newUnreadCount > lastUnreadCountRef.current && lastUnreadCountRef.current !== 0) {
                playNotificationSound();
            }
            lastUnreadCountRef.current = newUnreadCount;

            setNotifications((data.notifications || []).slice(0, 5)); // Show only 5 in dropdown
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
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Notificaciones"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown - centered on mobile, right-aligned on desktop */}
            {isOpen && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Notificaciones</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">Sin notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-lg">{NOTIFICATION_ICONS[n.type] || '📌'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{n.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                                        </div>
                                        {!n.read && (
                                            <button
                                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                                title="Marcar como leída"
                                            >
                                                <Check size={14} />
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
                            className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                            Ver todas las notificaciones →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
