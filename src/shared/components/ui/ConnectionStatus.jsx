import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * ConnectionStatus — shows a banner when the device is offline.
 * Mounts at the top of the screen below the header.
 */
export default function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setJustCameBack(true);
      setTimeout(() => setJustCameBack(false), 3000);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !justCameBack) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold transition-all duration-300 animate-slide-up
        ${online
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-600 text-white'
        }`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      {online ? (
        <>
          <Wifi size={16} />
          <span>Conexión restablecida</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Sin conexión — modo offline</span>
        </>
      )}
    </div>
  );
}
