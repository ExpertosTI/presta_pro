#!/bin/bash
# Deploy seguro — Presta Pro
# No hace "docker-compose down" (evita 502 durante el build).
# Uso: ./deploy-safe.sh [--rebuild]

set -euo pipefail

REBUILD=false
[[ "${1:-}" == "--rebuild" ]] && REBUILD=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

echo "═══════════════════════════════════════════"
echo "  Presta Pro — Diagnóstico y Deploy Seguro"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════"
echo ""

# ── 1. Pre-flight checks ──────────────────────
echo "── 1/6 Pre-flight ──"

DISK_USE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if (( DISK_USE > 90 )); then
  fail "Disco al ${DISK_USE}% — libera espacio antes de deploy"
elif (( DISK_USE > 80 )); then
  warn "Disco al ${DISK_USE}% — considera limpiar imágenes Docker viejas"
else
  ok "Disco: ${DISK_USE}% usado"
fi

if [[ ! -f docker-compose.yml ]]; then
  fail "No se encontró docker-compose.yml — ¿estás en /opt/presta_pro?"
fi
ok "docker-compose.yml presente"

if [[ ! -f .env ]] && [[ ! -f server/.env ]]; then
  warn "No hay .env — se usarán defaults de docker-compose.yml"
fi

if [[ -f .evolution.local ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.evolution.local
  set +a
fi

if [[ -n "${EVOLUTION_API_URL:-}" ]] && [[ -n "${EVOLUTION_API_KEY:-}" ]]; then
  ok "WhatsApp Evolution: ${EVOLUTION_INSTANCE:-?}"
else
  warn "WhatsApp Evolution: no configurado (solo email/push)"
fi

# ── 2. Estado actual ──────────────────────────
echo ""
echo "── 2/6 Estado actual ──"
docker-compose ps || true

echo ""
echo "Local health check:"
LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1:18080/ 2>/dev/null || echo "000")
API_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1:18080/api/health 2>/dev/null || echo "000")
echo "  web  (127.0.0.1:18080):     HTTP $LOCAL_CODE"
echo "  api  (/api/health):          HTTP $API_CODE"

# Cloudflare tunnel
if systemctl is-active --quiet cloudflared 2>/dev/null; then
  ok "cloudflared: activo (systemd)"
elif pgrep -x cloudflared >/dev/null 2>&1; then
  ok "cloudflared: corriendo (proceso)"
else
  warn "cloudflared: NO detectado — si usas túnel CF, revísalo"
fi

# ── 3. Logs recientes (si algo falla) ─────────
if [[ "$LOCAL_CODE" != "200" ]] || [[ "$API_CODE" != "200" ]]; then
  echo ""
  echo "── Logs recientes (servicios caídos) ──"
  docker-compose logs --tail=20 web 2>/dev/null || true
  echo "---"
  docker-compose logs --tail=20 api 2>/dev/null || true
  echo "---"
  docker-compose logs --tail=10 db 2>/dev/null || true
fi

# ── 4. Git pull ───────────────────────────────
echo ""
echo "── 3/6 Git pull ──"
BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
git fetch origin main 2>/dev/null || warn "git fetch falló — continuando con código local"
git pull origin main 2>/dev/null || warn "git pull falló — continuando con código local"
AFTER=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
if [[ "$BEFORE" != "$AFTER" ]]; then
  ok "Actualizado: ${BEFORE:0:8} → ${AFTER:0:8}"
else
  ok "Ya en el último commit (${AFTER:0:8})"
fi

# ── 5. Build + Deploy ─────────────────────────
echo ""
echo "── 4/6 Deploy ──"

if $REBUILD; then
  warn "Rebuild completo (--no-cache) — puede tardar varios minutos"
  docker-compose build --no-cache
else
  echo "Building (con cache)..."
  docker-compose build
fi

echo "Levantando/actualizando contenedores (sin down)..."
docker-compose up -d

echo "Esperando que los servicios arranquen..."
sleep 8

# ── 6. Health checks ──────────────────────────
echo ""
echo "── 5/6 Verificación ──"
docker-compose ps

LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 10 http://127.0.0.1:18080/ 2>/dev/null || echo "000")
API_BODY=$(curl -s --connect-timeout 10 http://127.0.0.1:18080/api/health 2>/dev/null || echo "FAIL")
API_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 10 http://127.0.0.1:18080/api/health 2>/dev/null || echo "000")

echo ""
echo "  web  (127.0.0.1:18080):     HTTP $LOCAL_CODE"
echo "  api  (/api/health):          HTTP $API_CODE — $API_BODY"

if [[ "$LOCAL_CODE" == "200" ]] && [[ "$API_CODE" == "200" ]]; then
  ok "Servicios locales OK"
else
  fail "Health check falló — revisa: docker-compose logs -f"
fi

# ── 7. Resumen ────────────────────────────────
echo ""
echo "── 6/6 Resumen ──"
echo -e "${GREEN}Deploy completado.${NC}"
echo "  Logs:    docker-compose logs -f"
echo "  Estado:  docker-compose ps"
echo "  Externo: curl -I https://prestanace.renace.tech"
echo ""
