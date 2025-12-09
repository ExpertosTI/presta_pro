# Comandos de Despliegue del Servidor (Docker)
# Ruta: `/opt/presta_pro`
# Rama: `email-templates-fix`

```bash
cd /opt/presta_pro
git pull origin email-templates-fix
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
