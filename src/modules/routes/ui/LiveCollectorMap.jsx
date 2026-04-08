import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, RefreshCw, Users, Clock, X } from 'lucide-react';
import api from '../../../services/axiosInstance';
import Card from '../../../shared/components/ui/Card';

/**
 * Panel de mapa en vivo para supervisores.
 * Muestra la ubicación de los cobradores con ruta activa.
 * Usa OpenStreetMap (gratis, sin API key).
 */
export function LiveCollectorMap({ onClose }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [error, setError] = useState(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/location/active');
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('No se pudieron obtener las ubicaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const getMapUrl = (loc) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.005}%2C${loc.lat - 0.005}%2C${loc.lng + 0.005}%2C${loc.lat + 0.005}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`;
  };

  const getAllMarkersUrl = () => {
    if (locations.length === 0) return null;
    if (locations.length === 1) return getMapUrl(locations[0]);
    // For multiple, center on first and show wider view
    const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
    const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
    const spread = Math.max(0.01, ...locations.map(l => Math.abs(l.lat - avgLat)), ...locations.map(l => Math.abs(l.lng - avgLng))) * 2;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${avgLng - spread}%2C${avgLat - spread}%2C${avgLng + spread}%2C${avgLat + spread}&layer=mapnik&marker=${locations[0].lat}%2C${locations[0].lng}`;
  };

  const displayLoc = selectedCollector
    ? locations.find(l => l.collectorId === selectedCollector)
    : null;

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MapPin size={20} className="text-emerald-500" />
          Ubicación en Vivo
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLocations}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3 border border-red-200">
          {error}
        </div>
      )}

      {/* No active collectors */}
      {!loading && locations.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <Users size={48} className="mb-3 opacity-50" />
          <p className="text-sm font-medium">No hay cobradores con ruta activa</p>
          <p className="text-xs mt-1">Cuando un cobrador active su ruta, su ubicación aparecerá aquí.</p>
        </div>
      )}

      {/* Collector list */}
      {locations.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {locations.map((loc) => (
            <button
              key={loc.collectorId}
              onClick={() => setSelectedCollector(
                selectedCollector === loc.collectorId ? null : loc.collectorId
              )}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCollector === loc.collectorId
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {loc.collectorName}
              <span className="text-[10px] opacity-70">
                {loc.minutesAgo === 0 ? 'ahora' : `hace ${loc.minutesAgo}m`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      {locations.length > 0 && (
        <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative">
          <iframe
            title="Mapa de cobradores"
            src={displayLoc ? getMapUrl(displayLoc) : getAllMarkersUrl()}
            className="w-full h-full min-h-[280px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {/* Overlay with accuracy info */}
          {displayLoc && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-slate-600 shadow-sm border border-slate-200">
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                <span>
                  Última actualización: {displayLoc.minutesAgo === 0 ? 'justo ahora' : `hace ${displayLoc.minutesAgo} min`}
                </span>
              </div>
              {displayLoc.accuracy && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Precisión: ±{Math.round(displayLoc.accuracy)}m
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Google Maps external link */}
      {displayLoc && (
        <a
          href={`https://www.google.com/maps?q=${displayLoc.lat},${displayLoc.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-center text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Abrir en Google Maps
        </a>
      )}
    </Card>
  );
}

export default LiveCollectorMap;
