import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, X, Navigation, Phone, ChevronDown, ChevronUp, MapPin, LocateFixed, Save } from 'lucide-react';
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
      const script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = () => resolve(window.L);
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) { clearInterval(check); resolve(window.L); }
      }, 100);
    }
  });
}

function isDark() {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/* ─── Inject CSS ─── */
const STYLE_ID = 'rmv-map-styles';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes rmv-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
    @keyframes rmv-ring { 0%{transform:scale(1);opacity:0.6} 70%{transform:scale(2.5);opacity:0} 100%{transform:scale(2.5);opacity:0} }
    @keyframes rmv-dash { to { stroke-dashoffset: -20; } }
    .rmv-route-line { stroke-dasharray: 10 10; animation: rmv-dash 1s linear infinite; }
    .rmv-popup .leaflet-popup-content-wrapper {
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.4); padding: 0;
    }
    .dark .rmv-popup .leaflet-popup-content-wrapper {
      background: rgba(30,41,59,0.92); border: 1px solid rgba(255,255,255,0.08);
    }
    .rmv-popup .leaflet-popup-content { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    .rmv-popup .leaflet-popup-tip {
      background: rgba(255,255,255,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    .dark .rmv-popup .leaflet-popup-tip { background: rgba(30,41,59,0.92); }
  `;
  document.head.appendChild(style);
}

function makeIcon(L, color, label, photoUrl, isPaid) {
  const safePhoto = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const gradient = isPaid
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : color === '#f59e0b'
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #6366f1, #4f46e5)';

  const photoHTML = safePhoto
    ? `<img src="${safePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
       <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff">${label}</div>`
    : `<span style="font-weight:800;font-size:12px;color:#fff">${label}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
    html: `<div style="width:38px;height:38px;border-radius:50%;background:${gradient};display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 15px rgba(0,0,0,0.25);overflow:hidden;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${photoHTML}</div>`,
  });
}

function makeCollectorIcon(L, photoUrl) {
  const safePhoto = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const inner = safePhoto
    ? `<img src="${safePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
       <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
       </div>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`;

  return L.divIcon({
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:48px;height:48px;border-radius:50%;border:2px solid #3b82f6;animation:rmv-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite"></div>
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 15px rgba(59,130,246,0.4);animation:rmv-pulse 3s ease-in-out infinite;overflow:hidden;position:relative;z-index:2">${inner}</div>
      </div>`,
  });
}

/* ─── Direction arrows ─── */
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
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      html: `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;transform:rotate(${90 - angle}deg)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#6366f1" stroke="none"><path d="M12 2l8 18H4z"/></svg>
      </div>`,
    });

    const m = L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(map);
    arrowsRef.current.push(m);
  }
}

export default function RouteMapView({ stops, visitStatuses, collectorId, collectorPhoto, onClose, onCobrar, onSaveLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const arrowsRef = useRef([]);
  const collectorMarkerRef = useRef(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStop, setExpandedStop] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [savingLocation, setSavingLocation] = useState(null);
  const [locationSaved, setLocationSaved] = useState({});

  useEffect(() => {
    injectStyles();
    loadLeaflet().then(leaflet => { setL(leaflet); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const geocodeCache = useRef(JSON.parse(sessionStorage.getItem('_geocache') || '{}'));
  const geocode = useCallback(async (stop) => {
    if (stop.clientLat && stop.clientLng) return { lat: stop.clientLat, lng: stop.clientLng };
    if (!stop.clientAddress) return null;
    const key = stop.clientAddress.trim().toLowerCase();
    if (geocodeCache.current[key]) return geocodeCache.current[key];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stop.clientAddress)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.current[key] = coords;
        sessionStorage.setItem('_geocache', JSON.stringify(geocodeCache.current));
        return coords;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    const fetchPos = async () => {
      try {
        const locs = await api.get('/location/active');
        const found = (Array.isArray(locs) ? locs : []).find(l => l.collectorId === collectorId || l.collectorId === 'owner');
        if (found) setCollectorPos({ lat: found.lat, lng: found.lng });
      } catch { /* ignore */ }
    };
    fetchPos();
    const iv = setInterval(fetchPos, 15000);
    return () => clearInterval(iv);
  }, [collectorId]);

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const dark = isDark();
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([18.48, -69.93], 13);
    tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [L]);

  // Dark mode observer
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !tileRef.current) return;
    const observer = new MutationObserver(() => {
      const dark = isDark();
      const map = mapInstanceRef.current;
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, { maxZoom: 19 }).addTo(map);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [L]);

  useEffect(() => {
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    const plotStops = async () => {
      const coords = [];
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const status = visitStatuses?.[stop.id] || 'PENDING';
        const isPaid = status === 'PAID';
        const pos = await geocode(stop);
        if (!pos) continue;
        coords.push([pos.lat, pos.lng]);
        const color = isPaid ? '#10b981' : status === 'NOT_HOME' || status === 'REFUSED' ? '#f59e0b' : '#6366f1';
        const icon = makeIcon(L, color, isPaid ? '✓' : String(i + 1), stop.clientPhotoUrl, isPaid);

        const dark = isDark();
        const textColor = dark ? '#e2e8f0' : '#1e293b';
        const subColor = dark ? '#94a3b8' : '#64748b';
        const statusColor = isPaid ? '#10b981' : '#6366f1';

        const navUrl = (stop.clientLat && stop.clientLng)
          ? `https://www.google.com/maps/dir/?api=1&destination=${stop.clientLat},${stop.clientLng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress || '')}`;

        const popupHTML = `
          <div style="padding:14px;min-width:160px;font-family:system-ui,-apple-system,sans-serif">
            <div style="font-weight:700;font-size:14px;color:${textColor};margin-bottom:3px">${stop.clientName}</div>
            <div style="font-size:11px;color:${subColor};margin-bottom:6px">${stop.clientAddress || ''}</div>
            <div style="font-weight:800;color:${statusColor};font-size:13px;margin-bottom:4px">#${stop.number} — ${formatCurrency(stop.payment)}</div>
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px">
              <span style="width:6px;height:6px;border-radius:50%;background:${statusColor}"></span>
              <span style="font-size:11px;color:${statusColor};font-weight:600">${isPaid ? '✓ Cobrado' : '⏳ Pendiente'}</span>
            </div>
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer"
               style="display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 12px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-radius:10px;text-decoration:none;font-size:12px;font-weight:600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Navegar al destino
            </a>
          </div>
        `;

        const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(map)
          .bindPopup(popupHTML, { className: 'rmv-popup', maxWidth: 260 });
        markersRef.current.push(marker);
      }

      // Animated route line
      if (coords.length > 1) {
        routeLineRef.current = L.polyline(coords, {
          color: '#6366f1',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10',
          className: 'rmv-route-line',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        addArrows(L, map, coords, arrowsRef);
      }

      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        if (collectorPos) bounds.extend([collectorPos.lat, collectorPos.lng]);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    };
    plotStops();
  }, [L, stops, visitStatuses, geocode, collectorPos]);

  useEffect(() => {
    if (!L || !mapInstanceRef.current || !collectorPos) return;
    const map = mapInstanceRef.current;
    if (collectorMarkerRef.current) map.removeLayer(collectorMarkerRef.current);
    collectorMarkerRef.current = L.marker([collectorPos.lat, collectorPos.lng], {
      icon: makeCollectorIcon(L, collectorPhoto), zIndexOffset: 1000,
    }).addTo(map).bindPopup(
      `<div style="padding:10px;font-family:system-ui;text-align:center">
        <strong style="font-size:13px">📍 Mi ubicación</strong>
        <div style="font-size:10px;color:#64748b;margin-top:4px">Actualizando en tiempo real</div>
      </div>`,
      { className: 'rmv-popup' }
    );
  }, [L, collectorPos, collectorPhoto]);

  const centerOnCollector = () => {
    if (collectorPos && mapInstanceRef.current) mapInstanceRef.current.setView([collectorPos.lat, collectorPos.lng], 16, { animate: true });
  };

  const handleSaveClientLocation = async (stop) => {
    if (!collectorPos) return;
    setSavingLocation(stop.clientId);
    try {
      if (onSaveLocation) await onSaveLocation(stop.clientId, collectorPos.lat, collectorPos.lng);
      setLocationSaved(prev => ({ ...prev, [stop.clientId]: true }));
      setTimeout(() => setLocationSaved(prev => ({ ...prev, [stop.clientId]: false })), 3000);
    } catch { /* ignore */ }
    setSavingLocation(null);
  };

  const paidCount = stops.filter(s => (visitStatuses?.[s.id] || 'PENDING') === 'PAID').length;
  const pendingCount = stops.length - paidCount;
  const paidAmount = stops.filter(s => (visitStatuses?.[s.id] || 'PENDING') === 'PAID').reduce((sum, s) => sum + (s.payment || 0), 0);
  const totalAmount = stops.reduce((sum, s) => sum + (s.payment || 0), 0);
  const progress = stops.length > 0 ? (paidCount / stops.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col safe-area-insets" data-fullscreen>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg z-10 safe-area-top">
        <div className="flex items-center gap-2 min-w-0">
          {collectorPhoto ? (
            <img src={collectorPhoto} alt="" className="w-8 h-8 rounded-full border-2 border-white/50 object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Navigation size={16} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-sm leading-tight truncate">Ruta en Curso</h2>
            <p className="text-[10px] opacity-80 leading-tight">{stops.length} paradas • {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {collectorPos && (
            <button onClick={centerOnCollector} className="p-2 hover:bg-white/20 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" title="Mi ubicación">
              <LocateFixed size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Stats + progress */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-around py-1.5 text-[11px]">
          <div className="text-center"><span className="font-bold text-emerald-600">{paidCount}</span><span className="text-slate-500 ml-0.5">cobrados</span></div>
          <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
          <div className="text-center"><span className="font-bold text-indigo-600">{pendingCount}</span><span className="text-slate-500 ml-0.5">pendientes</span></div>
          <div className="h-3 w-px bg-slate-300 dark:bg-slate-600" />
          <div className="text-center"><span className="font-bold text-emerald-600">{formatCurrency(paidAmount)}</span></div>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 transition-all duration-500 rounded-r-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
            <div className="text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '200px' }} />
      </div>

      {/* Bottom sheet */}
      <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-[max-height] duration-300 overflow-hidden ${sheetExpanded ? 'max-h-[60vh]' : 'max-h-[30vh]'}`}>
        <button onClick={() => setSheetExpanded(!sheetExpanded)} className="sticky top-0 w-full bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800 z-10 flex flex-col items-center">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mb-1" />
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            Paradas ({stops.length}) {sheetExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </p>
        </button>

        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: sheetExpanded ? 'calc(60vh - 40px)' : 'calc(30vh - 40px)' }}>
          {stops.map((stop, idx) => {
            const status = visitStatuses?.[stop.id] || 'PENDING';
            const isPaid = status === 'PAID';
            const isExpanded = expandedStop === stop.id;
            const isSaving = savingLocation === stop.clientId;
            const saved = locationSaved[stop.clientId];
            const hasGPS = !!(stop.clientLat && stop.clientLng);

            const navUrl = hasGPS
              ? `https://www.google.com/maps/dir/?api=1&destination=${stop.clientLat},${stop.clientLng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress || '')}`;

            return (
              <div key={stop.id} className={`border-b border-slate-100 dark:border-slate-800 ${isPaid ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                <button onClick={() => setExpandedStop(isExpanded ? null : stop.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800 touch-manipulation">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold overflow-hidden ${isPaid ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
                    {stop.clientPhotoUrl ? (
                      <img src={stop.clientPhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : isPaid ? <CheckCircle size={16} /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${isPaid ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{stop.clientName}</span>
                      {isPaid && <span className="text-[9px] px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full font-bold">✓</span>}
                      {hasGPS && <MapPin size={10} className="text-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate leading-tight">{stop.clientAddress || 'Sin dirección'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-1">
                    <span className={`text-sm font-bold tabular-nums ${isPaid ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>{formatCurrency(stop.payment)}</span>
                    {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-2.5 animate-fade-in">
                    <div className="grid grid-cols-2 gap-1.5">
                      {stop.clientAddress && (
                        <a href={navUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold min-h-[44px] active:from-blue-100 active:to-indigo-100 touch-manipulation border border-blue-100 dark:border-blue-800/30">
                          <Navigation size={14} /> Navegar
                        </a>
                      )}
                      {stop.clientPhone && (
                        <a href={`tel:${stop.clientPhone}`} className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold min-h-[44px] active:bg-slate-200 touch-manipulation">
                          <Phone size={14} /> Llamar
                        </a>
                      )}
                      {collectorPos && onSaveLocation && (
                        <button onClick={() => handleSaveClientLocation(stop)} disabled={isSaving} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px] touch-manipulation transition-colors ${saved ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 active:bg-amber-100'}`}>
                          {isSaving ? <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : saved ? <><CheckCircle size={14} /> Guardada</> : <><Save size={14} /> Ubicación</>}
                        </button>
                      )}
                      {stop.clientPhone && (
                        <a href={`https://wa.me/${stop.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + stop.clientName + ', ¿me podrías compartir tu ubicación actual? 📍 Toca el clip 📎 > Ubicación > Enviar ubicación actual.')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-xs font-semibold min-h-[44px] active:bg-green-100 touch-manipulation">
                          <MapPin size={14} /> Pedir GPS
                        </a>
                      )}
                    </div>
                    {!isPaid && onCobrar && (
                      <button onClick={() => onCobrar(stop)} className="w-full mt-1.5 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white rounded-xl text-sm font-bold min-h-[48px] touch-manipulation transition-all shadow-lg shadow-emerald-600/20">
                        <CheckCircle size={16} /> Cobrar {formatCurrency(stop.payment)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
