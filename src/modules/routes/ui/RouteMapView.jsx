import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, X, Navigation, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';
import api from '../../../services/axiosInstance';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // JS
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

function makeIcon(L, color, label) {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<div style="
      width:32px;height:32px;border-radius:50%;background:${color};
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:12px;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${label}</div>`,
  });
}

function makeCollectorIcon(L) {
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="
      width:40px;height:40px;border-radius:50%;background:#3b82f6;
      display:flex;align-items:center;justify-content:center;
      border:3px solid #fff;box-shadow:0 2px 12px rgba(59,130,246,0.5);
      animation:pulse 2s infinite;
    "><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg></div>
    <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
  });
}

export default function RouteMapView({ stops, visitStatuses, collectorId, onClose, onNavigate: _onNavigate, onCobrar }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const collectorMarkerRef = useRef(null);
  const [L, setL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStop, setExpandedStop] = useState(null);
  const [collectorPos, setCollectorPos] = useState(null);

  // Load Leaflet
  useEffect(() => {
    loadLeaflet().then(leaflet => {
      setL(leaflet);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Geocode addresses (best-effort via Nominatim — cached in session)
  const geocodeCache = useRef(JSON.parse(sessionStorage.getItem('_geocache') || '{}'));
  const geocode = useCallback(async (address) => {
    if (!address) return null;
    const key = address.trim().toLowerCase();
    if (geocodeCache.current[key]) return geocodeCache.current[key];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
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

  // Fetch collector position
  useEffect(() => {
    const fetchPos = async () => {
      try {
        const locs = await api.get('/location/active');
        const found = (Array.isArray(locs) ? locs : []).find(l =>
          l.collectorId === collectorId || l.collectorId === 'owner'
        );
        if (found) setCollectorPos({ lat: found.lat, lng: found.lng });
      } catch { /* ignore */ }
    };
    fetchPos();
    const interval = setInterval(fetchPos, 15000);
    return () => clearInterval(interval);
  }, [collectorId]);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([18.48, -69.93], 13); // Default: Santo Domingo

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [L]);

  // Update markers when stops or statuses change
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    const plotStops = async () => {
      const coords = [];

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const status = visitStatuses?.[stop.id] || 'PENDING';
        const isPaid = status === 'PAID';
        const pos = await geocode(stop.clientAddress);
        if (!pos) continue;

        coords.push([pos.lat, pos.lng]);
        const color = isPaid ? '#10b981' : status === 'NOT_HOME' || status === 'REFUSED' ? '#f59e0b' : '#6366f1';
        const icon = makeIcon(L, color, isPaid ? '✓' : String(i + 1));

        const marker = L.marker([pos.lat, pos.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <strong>${stop.clientName}</strong><br/>
              <span style="font-size:11px;color:#666">${stop.clientAddress || ''}</span><br/>
              <span style="font-size:13px;font-weight:700;color:${isPaid ? '#10b981' : '#6366f1'}">
                Cuota #${stop.number} — ${formatCurrency(stop.payment)}
              </span><br/>
              <span style="font-size:11px;color:${isPaid ? '#10b981' : '#f59e0b'}">
                ${isPaid ? '✓ Cobrado' : '⏳ Pendiente'}
              </span>
            </div>
          `);

        markersRef.current.push(marker);
      }

      // Draw route line
      if (coords.length > 1) {
        routeLineRef.current = L.polyline(coords, {
          color: '#6366f1', weight: 3, opacity: 0.6, dashArray: '8,8',
        }).addTo(map);
      }

      // Fit bounds
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        if (collectorPos) bounds.extend([collectorPos.lat, collectorPos.lng]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    };

    plotStops();
  }, [L, stops, visitStatuses, geocode, collectorPos]);

  // Update collector marker
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !collectorPos) return;
    const map = mapInstanceRef.current;

    if (collectorMarkerRef.current) map.removeLayer(collectorMarkerRef.current);
    collectorMarkerRef.current = L.marker([collectorPos.lat, collectorPos.lng], {
      icon: makeCollectorIcon(L),
      zIndexOffset: 1000,
    }).addTo(map).bindPopup('<strong>📍 Tu ubicación</strong>');
  }, [L, collectorPos]);

  const paidCount = stops.filter(s => (visitStatuses?.[s.id] || 'PENDING') === 'PAID').length;
  const pendingCount = stops.length - paidCount;
  const paidAmount = stops.filter(s => (visitStatuses?.[s.id] || 'PENDING') === 'PAID')
    .reduce((sum, s) => sum + (s.payment || 0), 0);
  const pendingAmount = stops.reduce((sum, s) => sum + (s.payment || 0), 0) - paidAmount;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shadow-lg z-10">
        <div className="flex items-center gap-3">
          <Navigation size={20} />
          <div>
            <h2 className="font-bold text-sm">Ruta en Curso</h2>
            <p className="text-[10px] opacity-80">{stops.length} paradas • {formatCurrency(paidAmount + pendingAmount)} total</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Stats ribbon */}
      <div className="flex items-center justify-around py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs">
        <div className="text-center">
          <span className="font-bold text-emerald-600">{paidCount}</span>
          <span className="text-slate-500 ml-1">Cobrados</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
        <div className="text-center">
          <span className="font-bold text-indigo-600">{pendingCount}</span>
          <span className="text-slate-500 ml-1">Pendientes</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
        <div className="text-center">
          <span className="font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
          <span className="text-slate-500 ml-1">Recaudado</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${stops.length > 0 ? (paidCount / stops.length) * 100 : 0}%` }}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
            <div className="text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Bottom sheet — stop list */}
      <div className="max-h-[35vh] overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800 z-10">
          <div className="w-8 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-500 text-center">Paradas de la ruta</p>
        </div>

        {stops.map((stop, idx) => {
          const status = visitStatuses?.[stop.id] || 'PENDING';
          const isPaid = status === 'PAID';
          const isExpanded = expandedStop === stop.id;

          return (
            <div key={stop.id} className={`border-b border-slate-100 dark:border-slate-800 ${isPaid ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
              <button
                onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                {/* Number/status circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                  isPaid ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}>
                  {isPaid ? <CheckCircle size={14} /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold truncate ${isPaid ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                      {stop.clientName}
                    </span>
                    {isPaid && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">Cobrado</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{stop.clientAddress}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                    {formatCurrency(stop.payment)}
                  </span>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400 ml-1 inline" /> : <ChevronDown size={14} className="text-slate-400 ml-1 inline" />}
                </div>
              </button>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="px-4 pb-3 flex items-center gap-2 animate-fade-in">
                  {stop.clientAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.clientAddress)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold"
                    >
                      <Navigation size={14} /> Ir
                    </a>
                  )}
                  {stop.clientPhone && (
                    <a href={`tel:${stop.clientPhone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                    >
                      <Phone size={14} /> Llamar
                    </a>
                  )}
                  {!isPaid && onCobrar && (
                    <button
                      onClick={() => onCobrar(stop)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      <CheckCircle size={14} /> Cobrar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
