---
description: Deploy Presta Pro to production server via Docker
---

# Despliegue de Presta Pro en Producción

## Información del Servidor
- **Host**: ronuimport (servidor de producción)
- **Ruta**: `/opt/presta_pro`
- **Stack**: Docker Compose (PostgreSQL + Node API + Nginx Frontend)
- **Rama principal**: `main` o rama específica

## Comandos de Actualización

### 1. Conectar al servidor
```bash
ssh root@ronuimport
```

### 2. Actualizar desde una rama específica
```bash
cd /opt/presta_pro
git fetch origin && git reset --hard origin/NOMBRE_RAMA
docker-compose build --no-cache && docker-compose up -d
```

### 3. Solo actualizar sin rebuild (cambios menores)
```bash
cd /opt/presta_pro
git fetch origin && git reset --hard origin/NOMBRE_RAMA
docker-compose up -d
```

### 4. Aplicar migraciones de base de datos
```bash
docker-compose exec presta_pro_api npx prisma migrate deploy
docker-compose exec presta_pro_api npx prisma generate
```

### 5. Ver logs
```bash
docker-compose logs -f presta_pro_api
docker-compose logs -f presta_pro_web
```

### 6. Reiniciar servicios
```bash
docker-compose restart
```

### 7. Estado de contenedores
```bash
docker-compose ps
```

## Ejemplo Completo de Actualización
```bash
cd /opt/presta_pro
git fetch origin && git reset --hard origin/architecture/feature-modules
docker-compose build --no-cache && docker-compose up -d
docker-compose exec presta_pro_api npx prisma migrate deploy
```

## Notas
- Siempre hacer `git fetch` antes de `reset --hard`
- Usar `--no-cache` en build si hay cambios en dependencias
- Las migraciones solo son necesarias si se modificó `schema.prisma`
