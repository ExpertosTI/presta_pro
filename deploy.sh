#!/bin/bash
# Script de Deployment - Presta Pro
# Ejecutar en el servidor: /opt/presta_pro

set -e  # Exit on error

echo "🚀 Iniciando deployment de Presta Pro..."
echo "📍 Directorio: $(pwd)"
echo "🌿 Branch: email-templates-fix"
echo ""

# 1. Pull latest changes
echo "📥 1/5 - Pulling cambios desde Git..."
git pull origin email-templates-fix

# 2. Stop containers
echo "🛑 2/5 - Deteniendo contenedores..."
docker-compose down

# 3. Build with no cache (para asegurar cambios recientes)
echo "🔨 3/5 - Building imágenes Docker..."
docker-compose build --no-cache

# 4. Start containers
echo "▶️  4/5 - Iniciando contenedores..."
docker-compose up -d

# 5. Check status
echo "✅ 5/5 - Verificando estado..."
sleep 3
docker-compose ps

echo ""
echo "✨ Deployment completado!"
echo "🔍 Para ver logs: docker-compose logs -f"
echo "🏥 Health check: curl http://localhost:4000/health"
