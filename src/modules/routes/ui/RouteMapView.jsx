import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, X, Navigation, Phone, ChevronDown, ChevronUp, MapPin, LocateFixed, Save } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import api from '../../../services/axiosInstance';

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

function makeIcon(L, color, label, photoUrl) {
  const safePhoto = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const photoHTML = safePhoto
    ? `<img src="${safePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#fff">${label}</div>`
    : `<span style="font-weight:800;font-size:11px;color:#fff">${label}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;">${photoHTML}</div>`,
  });
}

function makeCollectorIcon(L, photoUrl) {
  const safePhoto = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const inner = safePhoto
    ? `<img src="${safePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg></div>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`;

  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<div style="width:44px;height:44px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 12px rgba(59,130,246,0.5);animation:cpulse 2s infinite;overflow:hidden;">${inner}</div><style>@keyframes cpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}</style>`,
  });
}

export default function RouteMapView({ stops, visitStatuses, collectorId, collectorPhoto, onClose, onCobrar, onSaveLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const collectorMarkerRef = useRef(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStop, setExpandedStop] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [savingLocation, setSavingLocation] = useState(null);
  const [locationSaved, setLocationSaved] = useState({});

  useEffect(() => {
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
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([18.48, -69.93], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapInstanceRef.current = null; };
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
        const icon = makeIcon(L, color, isPaid ? '✓' : String(i + 1), stop.clientPhotoUrl);
        const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(map)
          .bindPopup(`<div style="min-width:130px;font-family:system-ui;font-size:13px"><strong>${stop.clientName}</strong><br/><span style="font-size:11px;color:#666">${stop.clientAddress || ''}</span><br/><span style="font-weight:700;color:${isPaid ? '#10b981' : '#6366f1'}">#${stop.number} — ${formatCurrency(stop.payment)}</span><br/><span style="font-size:11px;color:${isPaid ? '#10b981' : '#f59e0b'}">${isPaid ? '✓ Cobrado' : '⏳ Pendiente'}</span></div>`);
        markersRef.current.push(marker);
      }
      if (coords.length > 1) {
        routeLineRef.current = L.polyline(coords, { color: '#6366f1', weight: 3, opacity: 0.6, dashArray: '8,8' }).addTo(map);
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
    }).addTo(map).bindPopup('<strong>📍 Mi ubicación</strong>');
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
      <div className="flex items-center justify-between px-3 py-2.5 bg-indigo-600 text-white shadow-lg z-10 safe-area-top">
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
        <div className="h-1 bg-slate-200 dark:bg-slate-700">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
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

            return (
              <div key={stop.id} className={`border-b border-slate-100 dark:border-slate-800 ${isPaid ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                <button onClick={() => setExpandedStop(isExpanded ? null : stop.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800 touch-manipulation">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold overflow-hidden ${isPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
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
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold min-h-[44px] active:bg-blue-100 touch-manipulation">
                          <Navigation size={14} /> Navegar
                        </a>
                      )}
                      {stop.clientPhone && (
                        <a href={`tel:${stop.clientPhone}`} className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold min-h-[44px] active:bg-slate-200 touch-manipulation">
                          <Phone size={14} /> Llamar
                        </a>
                      )}
                      {collectorPos && onSaveLocation && (
                        <button onClick={() => handleSaveClientLocation(stop)} disabled={isSaving} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold min-h-[44px] touch-manipulation transition-colors ${saved ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 active:bg-amber-100'}`}>
                          {isSaving ? <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : saved ? <><CheckCircle size={14} /> Guardada</> : <><Save size={14} /> Ubicación</>}
                        </button>
                      )}
                      {stop.clientPhone && (
                        <a href={`https://wa.me/${stop.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + stop.clientName + ', ¿me podrías compartir tu ubicación actual? 📍 Toca el clip 📎 > Ubicación > Enviar ubicación actual.')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold min-h-[44px] active:bg-green-100 touch-manipulation">
                          <MapPin size={14} /> Pedir GPS
                        </a>
                      )}
                    </div>
                    {!isPaid && onCobrar && (
                      <button onClick={() => onCobrar(stop)} className="w-full mt-1.5 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold min-h-[48px] touch-manipulation transition-colors shadow-lg shadow-emerald-600/20">
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
