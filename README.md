# Presta Pro v1.10

**Sistema Profesional de Gestión de Préstamos**  
*Desarrollado por RENACE.TECH*

![Version](https://img.shields.io/badge/version-1.10-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Mobile-green.svg)

---

## 📋 Descripción

Presta Pro es una aplicación SaaS completa para la gestión de préstamos personales y microfinanzas. Diseñada para prestamistas individuales y empresas financieras en República Dominicana y Latinoamérica.

### ✨ Características Principales

- **Gestión de Clientes**: CRUD completo con documentos, fotos y geolocalización
- **Préstamos**: Múltiples frecuencias (diario, semanal, quincenal, mensual)
- **Amortización**: Sistema FLAT y FRANCÉS con calculadora visual
- **Cobradores**: Sistema de roles, permisos y rutas de cobro
- **Notificaciones**: Email, push y WhatsApp automático
- **Reportes**: Contabilidad, morosidad, rendimiento con exportación PDF/Excel
- **Multi-tenant**: Arquitectura SaaS con planes de suscripción
- **PWA**: Funciona offline, instalable en móviles
- **Modo Oscuro**: Interfaz adaptativa

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | UI Framework |
| Vite | 4.x | Build Tool |
| TailwindCSS | 3.x | Styling |
| Lucide React | 0.x | Icons |
| jsPDF | 2.x | PDF Generation |
| SheetJS | x | Excel Export |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 20.x LTS | Runtime |
| Express | 4.x | API Framework |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Database |
| JWT | - | Authentication |
| bcrypt | - | Password Hashing |
| nodemailer | - | Email Service |

### Infraestructura
| Tecnología | Uso |
|------------|-----|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Nginx | Reverse Proxy / SSL |
| Certbot | Let's Encrypt SSL |

---

## 📦 Instalación

### Requisitos Previos
- Node.js 20.x LTS
- PostgreSQL 15+
- Docker & Docker Compose (para producción)
- Git

### Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/ExpertosTI/presta_pro.git
cd presta_pro

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar base de datos (con Docker)
docker-compose up -d postgres

# Ejecutar migraciones
cd server && npx prisma migrate dev

# Iniciar desarrollo
npm run dev
```

### Producción con Docker

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones completas.

---

## 🔐 Seguridad

Este sistema implementa múltiples capas de seguridad. Ver [SECURITY.md](./SECURITY.md) para detalles completos.

### Medidas Implementadas
- ✅ Autenticación JWT con expiración
- ✅ Passwords hasheados con bcrypt (12 rounds)
- ✅ Rate limiting en endpoints críticos
- ✅ Validación de entrada en frontend y backend
- ✅ CORS restrictivo en producción
- ✅ Headers de seguridad (Helmet)
- ✅ Protección CSRF
- ✅ Logs de auditoría
- ✅ Aislamiento multi-tenant
- ✅ Verificación de suscripción en middleware

---

## 📚 Documentación

| Archivo | Contenido |
|---------|-----------|
| [README.md](./README.md) | Este archivo - Descripción general |
| [DEPLOY.md](./DEPLOY.md) | Instrucciones de despliegue |
| [SECURITY.md](./SECURITY.md) | Medidas de seguridad |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de cambios |
| [CREDITS.md](./CREDITS.md) | Créditos y licencias |

---

## 🌐 Endpoints API

### Autenticación
```
POST /api/auth/login       - Iniciar sesión
POST /api/auth/register    - Registrar tenant
POST /api/auth/verify      - Verificar email
POST /api/auth/refresh     - Refrescar token
```

### Recursos Principales
```
GET/POST   /api/clients      - Clientes
GET/POST   /api/loans        - Préstamos
POST       /api/payments     - Pagos/Cobros
GET/POST   /api/collectors   - Cobradores
GET        /api/reports      - Reportes
GET/PUT    /api/settings     - Configuración
GET        /api/notifications - Notificaciones
```

---

## 📱 Apps Móviles

La aplicación está preparada para compilación móvil:

```bash
# Android (Capacitor)
npx cap add android
npx cap sync
npx cap open android

# iOS
npx cap add ios
npx cap sync
npx cap open ios
```

---

## 🆘 Soporte

- **Email**: info@renace.tech
- **WhatsApp**: +1 (849) 457-7463
- **Web**: https://renace.tech/PrestApp/

---

## 📄 Licencia

Copyright © 2024 RENACE.TECH  
Todos los derechos reservados.

Este software es propietario. Ver [LICENSE](./LICENSE) para términos completos.

---

## 👥 Equipo

Desarrollado con ❤️ por **RENACE.TECH**

Ver [CREDITS.md](./CREDITS.md) para el equipo completo y agradecimientos.
