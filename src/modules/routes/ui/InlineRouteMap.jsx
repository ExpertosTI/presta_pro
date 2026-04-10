import React, { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
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

function makePin(L, color, label, photoUrl) {
  const safe = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const inner = safe
    ? `<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#fff">${label}</div>`
    : `<span style="font-weight:800;font-size:11px;color:#fff">${label}</span>`;
  return L.divIcon({
    className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);overflow:hidden">${inner}</div>`,
  });
}

function makeMe(L, photoUrl) {
  const safe = photoUrl ? photoUrl.replace(/"/g, '&quot;') : '';
  const inner = safe
    ? `<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg></div>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`;
  return L.divIcon({
    className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    html: `<div style="width:40px;height:40px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 10px rgba(59,130,246,0.5);animation:mpulse 2s infinite;overflow:hidden">${inner}</div><style>@keyframes mpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
  });
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
  const markersRef = useRef([]);
  const lineRef = useRef(null);
  const meMarkerRef = useRef(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mePos, setMePos] = useState(null);

  // Load leaflet
  useEffect(() => {
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
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([18.48, -69.93], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInst.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => { map.remove(); mapInst.current = null; };
  }, [L]);

  // Resize fix when container changes
  useEffect(() => {
    if (mapInst.current) setTimeout(() => mapInst.current.invalidateSize(), 100);
  });

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
      const icon = makePin(L, color, isPaid ? '✓' : String(i + 1), stop.clientPhotoUrl);
      const latlng = [stop.clientLat, stop.clientLng];
      coords.push(latlng);

      const marker = L.marker(latlng, { icon }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:120px;font-family:system-ui;font-size:13px">
          <strong>${stop.clientName}</strong><br/>
          <span style="font-size:11px;color:#666">${stop.clientAddress || ''}</span><br/>
          <strong style="color:${isPaid ? '#10b981' : '#6366f1'}">#${stop.number} — ${formatCurrency(stop.payment)}</strong><br/>
          <span style="font-size:11px;color:${isPaid ? '#10b981' : '#f59e0b'}">${isPaid ? '✓ Cobrado' : '⏳ Pendiente'}</span>
        </div>`
      );
      marker.on('click', () => {
        if (onStopClick) onStopClick(stop);
      });
      markersRef.current.push(marker);
    });

    if (coords.length > 1) {
      lineRef.current = L.polyline(coords, { color: '#6366f1', weight: 3, opacity: 0.5, dashArray: '8,8' }).addTo(map);
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
    }).addTo(map).bindPopup('<strong>📍 Mi ubicación</strong>');
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
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-lg text-[11px] font-medium flex items-center gap-1.5">
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
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg p-2 shadow-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors touch-manipulation"
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
            <MapPin size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin ubicaciones GPS</p>
            <p className="text-xs text-slate-400 mt-1">Guarda la ubicación de los clientes para ver la ruta en el mapa</p>
          </div>
        </div>
      )}
    </div>
  );
}
