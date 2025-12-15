# Guía de Despliegue - Presta Pro v1.10

Esta guía cubre el despliegue completo de Presta Pro en un servidor de producción.

---

## 📋 Requisitos del Servidor

### Hardware Mínimo
| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB SSD | 50 GB SSD |
| Ancho de banda | 100 Mbps | 1 Gbps |

### Software
- Ubuntu 22.04 LTS (recomendado)
- Docker 24.x+
- Docker Compose 2.x+
- Git
- Certbot (para SSL)

---

## 🚀 Despliegue Inicial

### 1. Preparar Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Crear directorio
sudo mkdir -p /opt/presta_pro
sudo chown $USER:$USER /opt/presta_pro
cd /opt/presta_pro
```

### 2. Clonar Repositorio

```bash
git clone https://github.com/ExpertosTI/presta_pro.git .
git checkout v1.10
```

### 3. Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.example .env.production

# Editar con valores de producción
nano .env.production
```

**Variables obligatorias:**
```bash
# Base de datos
DATABASE_URL=postgresql://prestapro:PASSWORD_SEGURO@postgres:5432/prestapro?schema=public

# JWT - GENERAR CLAVE ÚNICA
JWT_SECRET=GENERAR_CON_openssl_rand_-base64_64

# SMTP
SMTP_HOST=mail.tudominio.com
SMTP_PORT=465
SMTP_USER=noreply@tudominio.com
SMTP_PASSWORD=tu_password_smtp
SMTP_FROM=noreply@tudominio.com

# Producción
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com
```

### 4. Configurar Nginx

```bash
# Editar nginx.conf con tu dominio
nano nginx.conf
```

Cambiar `server_name` a tu dominio.

### 5. Obtener Certificado SSL

```bash
# Detener nginx temporal si está corriendo
sudo systemctl stop nginx

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Los certificados estarán en:
# /etc/letsencrypt/live/tudominio.com/fullchain.pem
# /etc/letsencrypt/live/tudominio.com/privkey.pem
```

### 6. Build y Deploy

```bash
# Construir imágenes
docker compose build --no-cache

# Ejecutar migraciones
docker compose run --rm backend npx prisma migrate deploy

# Iniciar servicios
docker compose up -d

# Verificar estado
docker compose ps
docker compose logs -f
```

---

## 🔄 Actualización

### Actualizar a Nueva Versión

```bash
cd /opt/presta_pro

# Hacer backup
./scripts/backup.sh

# Obtener cambios
git fetch origin
git checkout v1.10
git pull origin v1.10

# Reconstruir
docker compose down
docker compose build --no-cache
docker compose run --rm backend npx prisma migrate deploy
docker compose up -d

# Verificar
docker compose logs -f app
```

### Rollback

```bash
# Volver a versión anterior
git checkout v1.09
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 💾 Backups

### Backup Manual

```bash
# Backup de base de datos
docker compose exec postgres pg_dump -U prestapro prestapro > backup_$(date +%Y%m%d).sql

# Backup completo (DB + archivos)
tar -czvf backup_full_$(date +%Y%m%d).tar.gz \
  backup_*.sql \
  .env.production
```

### Backup Automático (Cron)

```bash
# Editar crontab
crontab -e

# Agregar línea (backup cada 6 horas)
0 */6 * * * cd /opt/presta_pro && docker compose exec -T postgres pg_dump -U prestapro prestapro > /backups/db_$(date +\%Y\%m\%d_\%H\%M).sql
```

### Restaurar Backup

```bash
# Restaurar base de datos
cat backup_20241215.sql | docker compose exec -T postgres psql -U prestapro prestapro
```

---

## 🔧 Comandos Útiles

### Docker

```bash
# Ver logs
docker compose logs -f app
docker compose logs -f backend

# Reiniciar servicio específico
docker compose restart backend

# Entrar al contenedor
docker compose exec backend sh

# Ver uso de recursos
docker stats
```

### Base de Datos

```bash
# Abrir consola PostgreSQL
docker compose exec postgres psql -U prestapro prestapro

# Ver migraciones pendientes
docker compose exec backend npx prisma migrate status

# Generar cliente Prisma
docker compose exec backend npx prisma generate
```

### Nginx / SSL

```bash
# Renovar certificados manualmente
sudo certbot renew

# Verificar configuración nginx
docker compose exec nginx nginx -t

# Recargar nginx
docker compose exec nginx nginx -s reload
```

---

## 🔍 Monitoreo

### Health Checks

```bash
# API health
curl https://tudominio.com/api/health

# Respuesta esperada
{ "status": "ok", "version": "1.10" }
```

### Logs Importantes

```bash
# Logs de aplicación
/var/log/presta_pro/app.log

# Logs de nginx
/var/log/nginx/access.log
/var/log/nginx/error.log

# Logs de Docker
docker compose logs --tail=100
```

---

## 🛠️ Troubleshooting

### Problema: 502 Bad Gateway
```bash
# Verificar que backend esté corriendo
docker compose ps
docker compose logs backend

# Reiniciar backend
docker compose restart backend
```

### Problema: Database connection failed
```bash
# Verificar PostgreSQL
docker compose logs postgres

# Verificar variables de entorno
docker compose exec backend env | grep DATABASE
```

### Problema: SSL certificate expired
```bash
# Renovar certificados
sudo certbot renew --force-renewal

# Reiniciar nginx
docker compose restart nginx
```

---

## 📊 Arquitectura de Producción

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS (443)
                      ▼
┌─────────────────────────────────────────────────────┐
│                   NGINX                              │
│  • SSL Termination                                   │
│  • Reverse Proxy                                     │
│  • Static Files                                      │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   FRONTEND    │           │   BACKEND     │
│   (React)     │           │   (Node.js)   │
│   Port 80     │           │   Port 3001   │
└───────────────┘           └───────┬───────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  PostgreSQL   │
                            │   Port 5432   │
                            └───────────────┘
```

---

## 📞 Soporte

Si tienes problemas con el despliegue:

- **Email**: info@renace.tech
- **WhatsApp**: +1 (849) 457-7463
- **GitHub Issues**: https://github.com/ExpertosTI/presta_pro/issues

---

*Última actualización: v1.10 - Diciembre 2024*
