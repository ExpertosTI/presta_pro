/**
 * NetworkMonitor — Detector de conectividad
 *
 * Detecta cambios online/offline mediante:
 *  1. Eventos nativos del navegador (window online/offline)
 *  2. Capacitor Network plugin (cuando está disponible)
 *  3. Heartbeat HTTP al servidor cada 30s para confirmar conectividad real
 *     (navigator.onLine puede mentir en hotspots cautivos)
 *
 * API de uso:
 *   networkMonitor.isOnline          → boolean actual
 *   networkMonitor.on('online', fn)  → callback cuando recupera red
 *   networkMonitor.on('offline', fn) → callback cuando pierde red
 *   networkMonitor.start()           → iniciar monitoreo
 *   networkMonitor.stop()            → detener (cleanup)
 */

const HEARTBEAT_INTERVAL_MS = 30_000;  // 30 segundos
const HEARTBEAT_TIMEOUT_MS  = 5_000;   // 5 segundos de timeout por request

class NetworkMonitor {
  constructor() {
    this._online = navigator?.onLine ?? true;
    this._heartbeatTimer = null;
    this._listeners = {};
    this._heartbeatUrl = null;
    this._started = false;
  }

  get isOnline() { return this._online; }

  /**
   * Inicia el monitoreo de red.
   * @param {string} heartbeatUrl - URL del servidor para el heartbeat (opcional).
   *   Si no se provee, solo usa los eventos del navegador.
   *   Ejemplo: 'https://api.prestapro.tech/api/health'
   */
  start(heartbeatUrl = null) {
    if (this._started) return;
    this._started = true;
    this._heartbeatUrl = heartbeatUrl;

    // ── Eventos nativos del browser ──────────────────────────────────────
    this._handleOnline  = () => this._setOnline(true);
    this._handleOffline = () => this._setOnline(false);

    window.addEventListener('online',  this._handleOnline);
    window.addEventListener('offline', this._handleOffline);

    // ── Capacitor Network plugin ─────────────────────────────────────────
    this._initCapacitorNetwork();

    // ── Heartbeat HTTP ───────────────────────────────────────────────────
    if (heartbeatUrl) {
      this._startHeartbeat();
    }

    console.info('[NetworkMonitor] Iniciado. Online:', this._online);
  }

  stop() {
    if (!this._started) return;
    this._started = false;

    window.removeEventListener('online',  this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);

    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    // Desregistrar listener de Capacitor si existe
    if (this._capacitorNetworkUnsub) {
      this._capacitorNetworkUnsub();
      this._capacitorNetworkUnsub = null;
    }
  }

  // ── Event emitter ────────────────────────────────────────────────────────

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => {
      try { fn(data); } catch (_) { /* no propagar errores */ }
    });
  }

  // ── Lógica interna ───────────────────────────────────────────────────────

  _setOnline(isOnline) {
    if (this._online === isOnline) return; // sin cambio, ignorar

    const wasOffline = !this._online;
    this._online = isOnline;

    if (isOnline) {
      console.info('[NetworkMonitor] Conexión restaurada ✓');
      this._emit('online', { timestamp: new Date().toISOString() });
      if (wasOffline) {
        this._emit('reconnect', { timestamp: new Date().toISOString() });
      }
    } else {
      console.warn('[NetworkMonitor] Sin conexión ✗');
      this._emit('offline', { timestamp: new Date().toISOString() });
    }
  }

  async _initCapacitorNetwork() {
    try {
      const { Network } = await import('@capacitor/network');

      // Estado inicial
      const status = await Network.getStatus();
      if (!status.connected) this._setOnline(false);

      // Escuchar cambios
      const handler = Network.addListener('networkStatusChange', (status) => {
        this._setOnline(status.connected);
      });

      // Guardar para cleanup
      this._capacitorNetworkUnsub = () => handler.remove();
    } catch (_) {
      // No estamos en Capacitor — ignorar silenciosamente
    }
  }

  _startHeartbeat() {
    this._heartbeatTimer = setInterval(async () => {
      const reallyOnline = await this._ping();
      if (reallyOnline !== this._online) {
        this._setOnline(reallyOnline);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Hace un HEAD request al heartbeatUrl con timeout.
   * Retorna true si el servidor responde 2xx/3xx.
   */
  async _ping() {
    if (!this._heartbeatUrl) return navigator?.onLine ?? true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

      const res = await fetch(this._heartbeatUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok || res.status < 500;
    } catch (_) {
      return false;
    }
  }
}

export const networkMonitor = new NetworkMonitor();
export default networkMonitor;
