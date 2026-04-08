import { useEffect, useRef, useCallback } from 'react';
import api from '../../../services/axiosInstance';

const UPDATE_INTERVAL_MS = 30 * 1000; // Send location every 30 seconds

/**
 * Hook que activa geolocalización cuando la ruta está activa
 * y envía la posición del cobrador al servidor periódicamente.
 */
export function useGeoTracking({ routeActive, collectorId, collectorName, showToast }) {
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  const sendPosition = useCallback(async (position) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    lastPositionRef.current = { lat, lng, accuracy };

    try {
      await api.post('/location/update', {
        lat,
        lng,
        accuracy,
        collectorId,
        collectorName,
      });
    } catch (err) {
      // Silently fail — don't spam the user
      console.warn('GPS update failed:', err.message);
    }
  }, [collectorId, collectorName]);

  const clearLocation = useCallback(async () => {
    try {
      await api.delete('/location/clear', { data: { collectorId } });
    } catch (_) { /* ignore */ }
  }, [collectorId]);

  useEffect(() => {
    if (!routeActive || !navigator.geolocation) {
      // Cleanup if route deactivated
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!routeActive && lastPositionRef.current) {
        clearLocation();
        lastPositionRef.current = null;
      }
      return;
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPositionRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED && showToast) {
          showToast('Activa el GPS para compartir tu ubicación en la ruta.', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Send position periodically
    // Send immediately first
    navigator.geolocation.getCurrentPosition(sendPosition, () => {}, {
      enableHighAccuracy: true, timeout: 10000,
    });

    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        sendPosition({ coords: lastPositionRef.current });
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [routeActive, sendPosition, clearLocation, showToast]);

  return { lastPosition: lastPositionRef.current };
}
