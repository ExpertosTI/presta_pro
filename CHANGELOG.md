# Changelog - Presta Pro

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.10] - 2024-12-15

### 🎉 Release Oficial

Esta es la primera versión oficial de Presta Pro para producción pública.

### ✨ Añadido

#### Módulo de Clientes
- CRUD completo de clientes
- Upload de foto y documentos
- Geolocalización con Google Maps
- Búsqueda y filtros avanzados
- Historial de préstamos por cliente

#### Módulo de Préstamos
- Múltiples frecuencias: DAILY, WEEKLY, BIWEEKLY, MONTHLY
- Amortización FLAT y FRENCH
- Calculadora visual con gráficos
- Generación de cronograma automático
- Penalidades por mora configurables

#### Módulo de Cobradores
- Gestión de cobradores con credenciales
- Sistema de permisos granular
- Asignación de clientes
- Rutas de cobro con GPS
- Comisiones calculadas automáticamente
- Filtro por estado (Activo/Inactivo)

#### Módulo de Rutas
- Vista de ruta del día
- Búsqueda de clientes en ruta
- Estados de visita (Pendiente, Visitado, No en casa, etc.)
- Botones rápidos: Llamar, WhatsApp, GPS
- Estadísticas diarias
- Filtro por zona

#### Módulo de Contabilidad y Reportes
- Dashboard con KPIs animados
- Gráficos de tendencia y distribución
- Reporte de morosidad
- Rendimiento por cobrador
- Top 5 deudores y pagadores
- Proyección de ingresos
- Balance general
- Cartera por estado
- ROI indicador
- Exportación PDF y Excel
- 6 presets de fechas

#### Módulo de Calculadora
- Selector de amortización (FLAT/FRENCH)
- Selector de fecha de inicio
- Costos de cierre
- Tarjetas de resumen
- Presets de productos
- Exportar PDF
- Compartir por WhatsApp
- Gráfico de barras

#### Módulo de Notificaciones
- Campana con contador
- Polling cada 60 segundos
- Sonido al recibir notificaciones (Web Audio API)
- Tipos: Pago, Mora, Sistema, Suscripción
- Preferencias de email (diario, semanal, mensual)
- Alertas configurables
- Botón de WhatsApp
- Agrupar por tipo
- Cards expansibles táctiles

#### Módulo de Ajustes
- Configuración de empresa (nombre, logo)
- Moneda principal (DOP, USD, EUR)
- Tasa de mora por defecto
- Temas de color (6 opciones)
- Días de gracia
- Frecuencias habilitadas
- Límites de préstamo (min/max)
- Términos y condiciones
- Footer de recibos
- Historial de cambios
- Reset a valores predeterminados
- Toggle ruta futura
- Toggle GPS en ruta
- Contraseña maestra
- Backup y restauración

#### Sistema SaaS
- Multi-tenancy completo
- Planes de suscripción (FREE, BASIC, PRO, ENTERPRISE)
- Límites por plan
- Verificación de email
- Páginas de pricing

#### Seguridad
- JWT authentication
- bcrypt password hashing (12 rounds)
- Rate limiting
- CORS restrictivo
- Headers de seguridad (Helmet)
- Logs de auditoría
- Validación de suscripción
- Protección anti-fraude

#### PWA
- Instalable en móviles
- Service Worker
- Offline support
- Push notifications ready

### 🔧 Configuración
- Docker y Docker Compose
- Nginx reverse proxy
- SSL/TLS con Let's Encrypt
- PostgreSQL con Prisma ORM

### 📚 Documentación
- README.md completo
- SECURITY.md con medidas de seguridad
- DEPLOY.md con guía de despliegue
- CREDITS.md con créditos
- LICENSE con términos de uso

---

## [1.09] - 2024-12-14

### Añadido
- Mejoras en módulo de contabilidad
- Fusión de Reportes y Contabilidad

---

## [1.08] - 2024-12-13

### Añadido
- Sistema de notificaciones
- Preferencias de email

---

## [1.07] - 2024-12-12

### Añadido
- Sistema de suscripciones
- Pricing view

---

## [1.06] - 2024-12-11

### Añadido
- Login y registro de tenants
- Verificación de email

---

## [1.05] - 2024-12-10

### Añadido
- Mejoras de seguridad
- Rate limiting

---

## [1.04] - 2024-12-09

### Añadido
- Rutas de cobro
- GPS tracking

---

## [1.03] - 2024-12-08

### Añadido
- Calculadora de préstamos
- Exportación PDF

---

## [1.02] - 2024-12-07

### Añadido
- Sistema de cobradores
- Permisos

---

## [1.01] - 2024-12-06

### Añadido
- Módulo de clientes
- Módulo de préstamos

---

## [1.00] - 2024-12-05

### Añadido
- Estructura inicial del proyecto
- Configuración de Vite + React
- Tailwind CSS
- Arquitectura base

---

*Mantenido por RENACE.TECH*
