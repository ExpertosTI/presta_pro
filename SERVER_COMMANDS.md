# Comandos de Despliegue del Servidor (Docker)
# Ruta: `/opt/presta_pro`
# Rama: `main`

```bash
cd /opt/presta_pro
git fetch origin
git checkout -B main origin/main
git reset --hard origin/main
read -s -p "GEMINI_API_KEY: " GEMINI_API_KEY && echo
CURRENT_JWT="$(grep '^JWT_SECRET=' .env 2>/dev/null | tail -1 | cut -d= -f2-)"
JWT_SECRET="${CURRENT_JWT:-$(openssl rand -hex 32)}"
touch .env
cp .env ".env.bak.$(date +%F-%H%M%S)"
grep -v '^GEMINI_API_KEY=' .env | grep -v '^JWT_SECRET=' > .env.tmp || true
printf 'GEMINI_API_KEY=%s\nJWT_SECRET=%s\n' "$GEMINI_API_KEY" "$JWT_SECRET" >> .env.tmp
mv .env.tmp .env
set -a
. ./.env
set +a
docker network inspect RenaceNet >/dev/null 2>&1 || docker network create RenaceNet
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Variables requeridas en el servidor
# La API key de Gemini ahora se maneja server-side (ya no está en el frontend).
# JWT_SECRET es la clave con la que el backend firma y valida los tokens de login.
# Si ya existe en .env, el script la reutiliza.
# Si no existe, el script genera una nueva con openssl y la guarda en .env.
# Si cambia el JWT_SECRET, las sesiones activas se invalidan y los usuarios deben iniciar sesión otra vez.
# RenaceNet es la red externa donde Traefik publica el sitio. Si no existe, el script la crea.
# prestapro_internal usa bridge porque este despliegue corre con docker-compose normal, no con Docker Swarm.
