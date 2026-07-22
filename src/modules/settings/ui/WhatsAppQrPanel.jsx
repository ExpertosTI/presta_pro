import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, CheckCircle2, WifiOff, Loader2, QrCode } from 'lucide-react';
import api from '../../../services/axiosInstance';

const STATE_LABEL = {
  open: 'Conectado',
  connecting: 'Esperando escaneo',
  close: 'Desconectado',
  unconfigured: 'No configurado',
  unknown: 'Desconocido',
};

function friendlyApiError(err, fallback = 'Error de WhatsApp') {
  const data = err?.response?.data;
  const status = err?.response?.status;
  const candidates = [data?.error, data?.detail, typeof data === 'string' ? data : null, err?.message];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const lower = raw.toLowerCase();
    if (
      lower.includes('cloudflare') ||
      lower.includes('<!doctype') ||
      lower.includes('<html') ||
      lower.includes('bad gateway') ||
      lower.includes('invalid or incomplete response')
    ) {
      return 'No se pudo hablar con Evolution (error de gateway). En el VPS usa URL interna en EVOLUTION_API_URL, no el dominio público detrás de Cloudflare.';
    }
    if (raw.startsWith('<') || raw.length > 280) continue;
    return raw;
  }
  if (status === 502 || status === 503) {
    return 'El servidor no pudo obtener respuesta de Evolution. Revisa EVOLUTION_API_URL en el VPS.';
  }
  return fallback;
}

/**
 * WhatsApp Evolution instance QR panel — used in Settings + Onboarding.
 */
export function WhatsAppQrPanel({ compact = false, autoFetch = true, className = '' }) {
  const [status, setStatus] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/whatsapp/status');
      setStatus(data);
      if (data?.ok === false && data?.detail) {
        setError(data.detail);
      }
      return data;
    } catch (err) {
      setError(friendlyApiError(err, 'Error de estado'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setLoadingQr(true);
    setError('');
    try {
      const data = await api.get('/whatsapp/qr');
      setQr(data);
      setLastRefresh(new Date());
      if (data.connected || data.state === 'open') {
        setStatus((prev) => ({ ...(prev || {}), state: 'open', configured: true, instance: data.instance }));
      }
      return data;
    } catch (err) {
      setError(friendlyApiError(err, 'Error al obtener QR'));
      setQr(null);
      return null;
    } finally {
      setLoadingQr(false);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return undefined;
    let cancelled = false;
    (async () => {
      const s = await refreshStatus();
      if (cancelled || !s) return;
      // Only auto-request QR when Evolution answered and is not already open
      if (s.configured && s.ok !== false && s.state !== 'open') {
        await fetchQr();
      }
    })();
    return () => { cancelled = true; };
  }, [autoFetch, refreshStatus, fetchQr]);

  // Poll connection while QR is visible
  useEffect(() => {
    if (!qr?.qrBase64 || qr?.connected) return undefined;
    const id = setInterval(async () => {
      const s = await refreshStatus();
      if (s?.state === 'open') {
        setQr((prev) => prev ? { ...prev, connected: true, state: 'open', qrBase64: null } : prev);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [qr?.qrBase64, qr?.connected, refreshStatus]);

  const state = status?.state || (status?.configured === false ? 'unconfigured' : 'unknown');
  const connected = state === 'open' || qr?.connected;

  return (
    <div
      data-tour="whatsapp-qr"
      className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageCircle size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
              WhatsApp · Instancia
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {status?.instance || 'Evolution API'}
              {lastRefresh ? ` · ${lastRefresh.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${
            connected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : state === 'unconfigured'
                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          }`}
        >
          {connected ? 'Conectado' : STATE_LABEL[state] || state}
        </span>
      </div>

      <div className={`p-4 ${compact ? 'space-y-3' : 'space-y-4'}`}>
        {!compact && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Escanea el código QR desde WhatsApp → <strong>Dispositivos vinculados</strong> → Vincular dispositivo.
            Así Presta Pro envía recibos y alertas con tu número.
          </p>
        )}

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {state === 'unconfigured' && !loading && (
          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
            <WifiOff size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              WhatsApp no está configurado en el servidor. Pide a soporte que configure
              <code className="mx-1 text-[11px]">EVOLUTION_*</code> en el VPS.
            </span>
          </div>
        )}

        {connected && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Instancia conectada y lista para enviar mensajes.</span>
          </div>
        )}

        {!connected && status?.configured && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center overflow-hidden">
              {loadingQr && !qr?.qrBase64 ? (
                <Loader2 className="animate-spin text-slate-400" size={28} />
              ) : qr?.qrBase64 ? (
                <img
                  src={qr.qrBase64}
                  alt="Código QR WhatsApp"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center px-4 text-slate-400">
                  <QrCode size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{qr?.message || 'Genera el QR para vincular'}</p>
                </div>
              )}
            </div>
            {qr?.pairingCode && (
              <p className="text-sm font-mono font-bold tracking-widest text-slate-700 dark:text-slate-200">
                Código: {qr.pairingCode}
              </p>
            )}
            <p className="text-[11px] text-slate-400 text-center max-w-xs">
              El QR caduca en ~60s. Si no conecta, pulsa actualizar.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={refreshStatus}
            disabled={loading}
            className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Estado
          </button>
          {status?.configured !== false && !connected && (
            <button
              type="button"
              onClick={fetchQr}
              disabled={loadingQr}
              className="flex-1 min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              {loadingQr ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {qr?.qrBase64 ? 'Actualizar QR' : 'Mostrar QR'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WhatsAppQrPanel;
