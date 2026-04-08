# Comandos de Despliegue del Servidor (Docker)
# Ruta: `/opt/presta_pro`
# Rama: `main`

```bash
cd /opt/presta_pro
git fetch origin
git checkout -B main origin/main
git reset --hard origin/main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Variables requeridas en el servidor
# La API key de Gemini ahora se maneja server-side (ya no está en el frontend).
# Configúrala antes de levantar los contenedores, junto con un JWT_SECRET real.
# Puedes exportarlas en la shell:
# export GEMINI_API_KEY=tu_clave_aqui
# export JWT_SECRET=un_secreto_largo_y_unico
# O dejarlas persistidas en el archivo .env del servidor.
