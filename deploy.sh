#!/bin/bash
# Script de Deployment - ReBless (Protocolo Renace)
# Ejecutar en el servidor: /opt/rebless

set -e  # Exit on error

STACK_NAME="rebless"
BRANCH="${1:-main}"

echo "🚀 Iniciando deployment de ReBless (Docker Swarm)..."
echo "📍 Directorio: /opt/rebless"
echo "🌿 Branch: ${BRANCH}"

# 1. Pull latest changes
echo "📥 1/5 - Pulling cambios desde Git..."
git fetch origin
git checkout "${BRANCH}"
git reset --hard origin/"${BRANCH}"

# 2. Build images
echo "🔨 2/5 - Building imágenes Docker..."
# Exportamos variables del .env para que docker-compose y stack deploy las vean
if [ -f .env ]; then
    echo "🔑 Cargando variables de entorno desde .env..."
    set -a; source .env; set +a
else
    echo "⚠️ ADVERTENCIA: No se encontró el archivo .env"
fi
docker compose build --no-cache

# 3. Ensure Network
echo "🌐 3/5 - Asegurando red RenaceNet..."
docker network ls --format '{{.Name}}' | grep -w RenaceNet > /dev/null || docker network create --driver overlay RenaceNet

# 4. Deploy Stack
echo "🚀 4/5 - Desplegando Stack..."
docker stack deploy -c docker-compose.yml $STACK_NAME

# 5. Force update
echo "🔄 5/5 - Forzando actualización de servicios..."
docker service update --force rebless_web
docker service update --force rebless_api

echo ""
echo "✨ Deployment completado!"
echo "🔍 Para ver logs: docker service logs -f rebless_api"
echo "🏥 Health check: curl http://localhost:4000/health"
