import React, { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Navigation } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import api from '../../../services/axiosInstance';

/* ─── Tile providers ─── */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

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
      const iv = setInterval(() => { if (window.L) { clearInterval(iv); resolve(window.L); } }, 100);
    }
  });
}

function isDark() {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/* ─── Inject CSS once ─── */
const STYLE_ID = 'irm-map-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes irm-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
    @keyframes irm-ring { 0%{transform:scale(1);opacity:0.6} 70%{transform:scale(2.5);opacity:0} 100%{transform:scale(2.5);opacity:0} }
    @keyframes irm-dash { to { stroke-dashoffset: -20; } }
    .irm-route-line { stroke-dasharray: 10 10; animation: irm-dash 1s linear infinite; }
    .irm-popup .leaflet-popup-content-wrapper {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.4); padding: 0;
    }
    .dark .irm-popup .leaflet-popup-content-wrapper {
      background: rgba(30,41,59,0.92); border: 1px solid rgba(255,255,255,0.08);
    }
    .irm-popup .leaflet-popup-content { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    .irm-popup .leaflet-popup-tip {
      background: rgba(255,255,255,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    .dark .irm-popup .leaflet-popup-tip { background: rgba(30,41,59,0.92); }
  `;
  document.head.appendChild(style);
}

/* ─── Pin maker ─── */
function makePin(L, color, label, photoUrl, isPaid) {
  const safe = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const gradient = isPaid
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : color === '#f59e0b'
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #6366f1, #4f46e5)';

  const inner = safe
    ? `<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/>
       <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#fff">${label}</div>`
    : `<span style="font-weight:800;font-size:11px;color:#fff">${label}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${gradient};display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.25);overflow:hidden;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${inner}</div>`,
  });
}

/* ─── Collector (me) marker ─── */
function makeMe(L, photoUrl) {
  const safe = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const inner = safe
    ? `<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/>
       <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
       </div>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`;

  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:44px;height:44px;border-radius:50%;border:2px solid #3b82f6;animation:irm-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite"></div>
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 15px rgba(59,130,246,0.4);animation:irm-pulse 3s ease-in-out infinite;overflow:hidden;position:relative;z-index:2">${inner}</div>
      </div>`,
  });
}

/* ─── Popup HTML ─── */
function popupContent(stop, isPaid) {
  const dark = isDark();
  const textColor = dark ? '#e2e8f0' : '#1e293b';
  const subColor = dark ? '#94a3b8' : '#64748b';
  const statusColor = isPaid ? '#10b981' : '#6366f1';
  const statusText = isPaid ? '✓ Cobrado' : '⏳ Pendiente';

  const navUrl = (stop.clientLat && stop.clientLng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${stop.clientLat},${stop.clientLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress || '')}`;

  return `
    <div style="padding:14px;min-width:160px;font-family:system-ui,-apple-system,sans-serif">
      <div style="font-weight:700;font-size:14px;color:${textColor};margin-bottom:4px">${stop.clientName}</div>
      <div style="font-size:11px;color:${subColor};margin-bottom:6px">${stop.clientAddress || 'Sin dirección'}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-weight:800;color:${statusColor};font-size:13px">#${stop.number} — ${formatCurrency(stop.payment)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px">
        <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block"></span>
        <span style="font-size:11px;color:${statusColor};font-weight:600">${statusText}</span>
      </div>
      <a href="${navUrl}" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 12px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-radius:10px;text-decoration:none;font-size:12px;font-weight:600">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        Navegar al destino
      </a>
    </div>
  `;
}

/* ─── Direction arrow decorator ─── */
function addArrows(L, map, coords, arrowsRef) {
  if (arrowsRef.current) arrowsRef.current.forEach(m => map.removeLayer(m));
  arrowsRef.current = [];

  if (coords.length < 2) return;

  for (let i = 0; i < coords.length - 1; i++) {
    const from = coords[i];
    const to = coords[i + 1];
    const midLat = (from[0] + to[0]) / 2;
    const midLng = (from[1] + to[1]) / 2;

    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * (180 / Math.PI);

    const arrowIcon = L.divIcon({
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;transform:rotate(${90 - angle}deg)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#6366f1" stroke="none"><path d="M12 2l8 18H4z"/></svg>
      </div>`,
    });

    const m = L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(map);
    arrowsRef.current.push(m);
  }
}

export default function InlineRouteMap({
  stops,
  visitStatuses,
  collectorId,
  collectorPhoto,
  routeActive,
  onStartRoute,
  onFinishRoute,
  onStopClick,
  onSaveLocation: _onSaveLocation,
}) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const lineRef = useRef(null);
  const arrowsRef = useRef([]);
  const meMarkerRef = useRef(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mePos, setMePos] = useState(null);

  useEffect(() => {
    injectStyles();
    loadLeaflet().then(l => { setL(l); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Track collector position
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const locs = await api.get('/location/active');
        const found = (Array.isArray(locs) ? locs : []).find(l => l.collectorId === collectorId || l.collectorId === 'owner');
        if (found) setMePos({ lat: found.lat, lng: found.lng });
      } catch { /* */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 15000);
    return () => clearInterval(iv);
  }, [collectorId]);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || mapInst.current) return;
    const dark = isDark();
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([18.48, -69.93], 13);
    tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInst.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); mapInst.current = null; };
  }, [L]);

  // Resize fix
  useEffect(() => {
    if (mapInst.current) setTimeout(() => mapInst.current.invalidateSize(), 100);
  });

  // Dark mode observer
  useEffect(() => {
    if (!L || !mapInst.current || !tileRef.current) return;
    const observer = new MutationObserver(() => {
      const dark = isDark();
      const map = mapInst.current;
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, { maxZoom: 19 }).addTo(map);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [L]);

  // Plot stops with GPS
  useEffect(() => {
    if (!L || !mapInst.current) return;
    const map = mapInst.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }

    const coords = [];
    const stopsWithGPS = stops.filter(s => s.clientLat && s.clientLng);

    stopsWithGPS.forEach((stop, i) => {
      const status = visitStatuses?.[stop.id] || 'PENDING';
      const isPaid = status === 'PAID';
      const color = isPaid ? '#10b981' : status === 'NOT_HOME' || status === 'REFUSED' ? '#f59e0b' : '#6366f1';
      const icon = makePin(L, color, isPaid ? '✓' : String(i + 1), stop.clientPhotoUrl, isPaid);
      const latlng = [stop.clientLat, stop.clientLng];
      coords.push(latlng);

      const marker = L.marker(latlng, { icon }).addTo(map);
      marker.bindPopup(popupContent(stop, isPaid), {
        className: 'irm-popup',
        maxWidth: 260,
        closeButton: true,
      });
      marker.on('click', () => {
        if (onStopClick) onStopClick(stop);
      });
      markersRef.current.push(marker);
    });

    // Animated route line
    if (coords.length > 1) {
      // Create SVG animated polyline
      lineRef.current = L.polyline(coords, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
        className: 'irm-route-line',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Add direction arrows
      addArrows(L, map, coords, arrowsRef);
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      if (mePos) bounds.extend([mePos.lat, mePos.lng]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [L, stops, visitStatuses, mePos, onStopClick]);

  // Collector marker
  useEffect(() => {
    if (!L || !mapInst.current || !mePos) return;
    const map = mapInst.current;
    if (meMarkerRef.current) map.removeLayer(meMarkerRef.current);
    meMarkerRef.current = L.marker([mePos.lat, mePos.lng], {
      icon: makeMe(L, collectorPhoto), zIndexOffset: 1000,
    }).addTo(map).bindPopup(
      `<div style="padding:10px;font-family:system-ui;text-align:center">
        <strong style="font-size:13px">📍 Mi ubicación</strong>
        <div style="font-size:10px;color:#64748b;margin-top:4px">Actualizando en tiempo real</div>
      </div>`,
      { className: 'irm-popup' }
    );
  }, [L, mePos, collectorPhoto]);

  const centerOnMe = () => {
    if (mePos && mapInst.current) mapInst.current.setView([mePos.lat, mePos.lng], 16, { animate: true });
  };

  const stopsWithGPS = stops.filter(s => s.clientLat && s.clientLng);
  const stopsWithoutGPS = stops.filter(s => !s.clientLat || !s.clientLng);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" style={{ height: '300px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />

      {/* Floating badges */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1.5">
        <div className="bg-white/92 dark:bg-slate-800/92 backdrop-blur-md rounded-xl px-2.5 py-1.5 shadow-lg border border-white/40 dark:border-slate-700/50 text-[11px] font-medium flex items-center gap-1.5">
          <MapPin size={12} className="text-indigo-500" />
          <span className="text-slate-700 dark:text-slate-200">{stopsWithGPS.length} con GPS</span>
          {stopsWithoutGPS.length > 0 && (
            <span className="text-slate-400">· {stopsWithoutGPS.length} sin GPS</span>
          )}
        </div>
      </div>

      {/* Floating controls - right side */}
      <div className="absolute top-2 right-12 z-[1000] flex flex-col gap-1.5">
        {mePos && (
          <button
            onClick={centerOnMe}
            className="bg-white/92 dark:bg-slate-800/92 backdrop-blur-md rounded-xl p-2 shadow-lg border border-white/40 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors touch-manipulation"
            title="Mi ubicación"
          >
            <LocateFixed size={16} className="text-blue-500" />
          </button>
        )}
      </div>

      {/* No GPS data overlay */}
      {stopsWithGPS.length === 0 && stops.length > 0 && !loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <div className="text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80 flex items-center justify-center mx-auto mb-3">
              <MapPin size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin ubicaciones GPS</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
              Guarda la ubicación de los clientes para ver la ruta en el mapa con trazado al destino
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
