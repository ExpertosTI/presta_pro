# Comandos de Despliegue del Servidor (Docker)
# Ruta: `/opt/presta_pro`
# Rama: `main`

```bash
cd /opt/presta_pro
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Nota: Configurar GEMINI_API_KEY en el servidor
# La API key de Gemini ahora se maneja server-side (ya no está en el frontend).
# Asegúrate de que esté configurada como variable de entorno:
# export GEMINI_API_KEY=tu_clave_aqui
# O en el .env del servidor.
