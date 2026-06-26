import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, RefreshCw, Users, Clock, X, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../../services/axiosInstance';
import Card from '../../../shared/components/ui/Card';

/* ─── Tile providers ─── */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

/* ─── Leaflet loader (reuse global) ─── */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const s = document.createElement('script');
      s.src = LEAFLET_JS;
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.appendChild(s);
    } else {
      const iv = setInterval(() => {
        if (window.L) { clearInterval(iv); resolve(window.L); }
      }, 100);
    }
  });
}

/* ─── Detect dark mode ─── */
function isDark() {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/* ─── Custom CSS injected once ─── */
const STYLE_ID = 'live-collector-map-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes lcm-pulse-ring {
      0% { transform: scale(1); opacity: 0.6; }
      70% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes lcm-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .lcm-marker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lcm-pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid #10b981;
      animation: lcm-pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    .lcm-marker-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 3px solid #fff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25), 0 0 0 2px rgba(16,185,129,0.3);
      animation: lcm-bob 3s ease-in-out infinite;
      position: relative;
      z-index: 2;
    }
    .lcm-marker-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .lcm-marker-label {
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 1px 8px;
      border-radius: 8px;
      z-index: 3;
      letter-spacing: 0.3px;
    }
    /* Popup override */
    .lcm-popup .leaflet-popup-content-wrapper {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.4);
      padding: 0;
    }
    .dark .lcm-popup .leaflet-popup-content-wrapper,
    .lcm-popup.lcm-dark .leaflet-popup-content-wrapper {
      background: rgba(30,41,59,0.92);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .lcm-popup .leaflet-popup-content {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .lcm-popup .leaflet-popup-tip {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .dark .lcm-popup .leaflet-popup-tip,
    .lcm-popup.lcm-dark .leaflet-popup-tip {
      background: rgba(30,41,59,0.92);
    }
  `;
  document.head.appendChild(style);
}

/* ─── Collector marker icon ─── */
function makeCollectorIcon(L, loc) {
  const photo = loc.photoUrl ? loc.photoUrl.replace(/"/g, '&quot;') : '';
  const initial = (loc.collectorName || '?')[0].toUpperCase();
  const gradient = loc.isStale
    ? 'linear-gradient(135deg, #94a3b8, #64748b)'
    : 'linear-gradient(135deg, #10b981, #059669)';

  const photoHTML = photo
    ? `<img src="${photo}" onerror="this.style.display='none';this.nextSibling.style.display='flex'" />`
    + `<div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;background:${gradient}">${initial}</div>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;background:${gradient}">${initial}</div>`;

  const pulseRing = loc.isStale ? '' : '<div class="lcm-pulse-ring"></div>';

  return L.divIcon({
    className: '',
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -30],
    html: `
      <div class="lcm-marker-wrap" style="width:54px;height:54px">
        ${pulseRing}
        <div class="lcm-marker-avatar" style="background:${gradient}">
          ${photoHTML}
        </div>
        <div class="lcm-marker-label">${loc.collectorName || 'Cobrador'}</div>
      </div>
    `,
  });
}

/* ─── Popup content ─── */
function popupHTML(loc, dark) {
  const time = loc.minutesAgo === 0 ? 'Justo ahora' : `Hace ${loc.minutesAgo} min`;
  const statusColor = loc.isStale ? '#f59e0b' : '#10b981';
  const statusText = loc.isStale ? 'Inactivo' : 'En ruta';
  const textColor = dark ? '#e2e8f0' : '#1e293b';
  const subColor = dark ? '#94a3b8' : '#64748b';

  return `
    <div style="padding:16px;min-width:180px;font-family:system-ui,-apple-system,sans-serif">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;overflow:hidden;flex-shrink:0">
          ${loc.photoUrl
      ? `<img src="${loc.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent='${(loc.collectorName || '?')[0]}'" />`
      : (loc.collectorName || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;color:${textColor}">${loc.collectorName}</div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
            <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block"></span>
            <span style="font-size:11px;color:${statusColor};font-weight:600">${statusText}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;color:${subColor}">
        <div style="display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${time}
        </div>
        ${loc.accuracy ? `<div style="font-size:10px">Precisión: ±${Math.round(loc.accuracy)}m</div>` : ''}
      </div>
      <a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:10px;padding:7px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:10px;text-decoration:none;font-size:12px;font-weight:600;text-align:center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        Abrir en Google Maps
      </a>
    </div>
  `;
}

/**
 * LiveCollectorMap — Panel de mapa en vivo para supervisores.
 * Muestra la ubicación de TODOS los cobradores con ruta activa usando Leaflet interactivo.
 * Tiles CartoDB con dark mode automático.
 */
export function LiveCollectorMap({ onClose }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const [L, setL] = useState(null);

  // Load leaflet + styles
  useEffect(() => {
    injectStyles();
    loadLeaflet().then(l => { setL(l); }).catch(() => {});
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/location/active');
      const locs = (Array.isArray(data) ? data : []).map(l => ({
        ...l,
        isStale: l.minutesAgo > 5,
      }));
      setLocations(locs);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('No se pudieron obtener las ubicaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchLocations();
    const iv = setInterval(fetchLocations, 15 * 1000);
    return () => clearInterval(iv);
  }, [fetchLocations]);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || mapInst.current) return;
    const dark = isDark();
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([18.48, -69.93], 13);

    tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, {
      maxZoom: 19,
      attribution: TILE_ATTR,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInst.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => { map.remove(); mapInst.current = null; };
  }, [L]);

  // Re-invalidate on expand/collapse
  useEffect(() => {
    if (mapInst.current) setTimeout(() => mapInst.current.invalidateSize(), 100);
  }, [expanded]);

  // Dark mode observer
  useEffect(() => {
    if (!L || !mapInst.current || !tileRef.current) return;
    const observer = new MutationObserver(() => {
      const dark = isDark();
      const map = mapInst.current;
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, {
        maxZoom: 19,
        attribution: TILE_ATTR,
      }).addTo(map);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [L]);

  // Plot markers
  useEffect(() => {
    if (!L || !mapInst.current) return;
    const map = mapInst.current;

    // Clear old
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (locations.length === 0) return;

    const dark = isDark();
    const bounds = [];

    locations.forEach(loc => {
      const latlng = [loc.lat, loc.lng];
      bounds.push(latlng);

      const icon = makeCollectorIcon(L, loc);
      const marker = L.marker(latlng, { icon, zIndexOffset: loc.isStale ? 100 : 500 }).addTo(map);
      marker.bindPopup(popupHTML(loc, dark), {
        className: `lcm-popup ${dark ? 'lcm-dark' : ''}`,
        maxWidth: 260,
        closeButton: true,
      });

      marker.on('click', () => {
        setSelectedCollector(
          selectedCollector === loc.collectorId ? null : loc.collectorId
        );
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (selectedCollector) {
      const sel = locations.find(l => l.collectorId === selectedCollector);
      if (sel) {
        map.setView([sel.lat, sel.lng], 16, { animate: true });
        // Open the popup for the selected collector
        const idx = locations.indexOf(sel);
        if (idx >= 0 && markersRef.current[idx]) {
          markersRef.current[idx].openPopup();
        }
        return;
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [L, locations, selectedCollector]);

  const activeCount = locations.filter(l => !l.isStale).length;
  const staleCount = locations.filter(l => l.isStale).length;

  return (
    <Card className={`flex flex-col overflow-hidden transition-all duration-300 ${expanded ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
            <MapPin size={16} className="text-white" />
          </div>
          Ubicación en Vivo
          {activeCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold">
              {activeCount} activo{activeCount !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchLocations}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title={expanded ? 'Minimizar' : 'Expandir'}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl mb-3 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* No active collectors */}
      {!loading && locations.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Users size={32} className="opacity-50" />
          </div>
          <p className="text-sm font-medium">No hay cobradores con ruta activa</p>
          <p className="text-xs mt-1 text-center max-w-[240px]">
            Cuando un cobrador active su ruta, su ubicación aparecerá aquí en tiempo real.
          </p>
        </div>
      )}

      {/* Collector filter chips */}
      {locations.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            onClick={() => setSelectedCollector(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !selectedCollector
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
            }`}
          >
            <Users size={12} />
            Todos ({locations.length})
          </button>
          {locations.map((loc) => (
            <button
              key={loc.collectorId}
              onClick={() =>
                setSelectedCollector(
                  selectedCollector === loc.collectorId ? null : loc.collectorId
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedCollector === loc.collectorId
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${loc.isStale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {loc.collectorName}
              <span className="text-[10px] opacity-70">
                {loc.minutesAgo === 0 ? 'ahora' : `${loc.minutesAgo}m`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      {locations.length > 0 && (
        <div className={`flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative ${expanded ? '' : 'min-h-[320px]'}`}>
          {loading && !mapInst.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: expanded ? '100%' : '320px' }} />

          {/* Stats overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-white/40 dark:border-slate-700/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{activeCount}</span>
                  <span className="text-slate-500 dark:text-slate-400">activos</span>
                </span>
                {staleCount > 0 && (
                  <>
                    <span className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{staleCount}</span>
                      <span className="text-slate-500 dark:text-slate-400">inactivos</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Auto-refresh indicator */}
          <div className="absolute top-3 left-3 z-[1000]">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-lg border border-white/40 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock size={10} />
              Actualización cada 15s
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default LiveCollectorMap;
