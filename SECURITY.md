# Seguridad - Presta Pro v1.10

Este documento detalla las medidas de seguridad implementadas en Presta Pro para proteger los datos de usuarios y prevenir accesos no autorizados.

---

## 🔐 Autenticación y Autorización

### JWT (JSON Web Tokens)
- **Algoritmo**: HS256
- **Expiración**: 24 horas (configurable)
- **Refresh Tokens**: Implementados para renovación segura
- **Almacenamiento**: localStorage con sanitización

```javascript
// Configuración JWT
{
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'prestapro.renace.tech'
}
```

### Contraseñas
- **Hashing**: bcrypt con 12 rounds de salt
- **Requisitos mínimos**: 8 caracteres (configurable)
- **Validación**: Formato email, longitud, caracteres especiales

### Roles y Permisos
| Rol | Permisos |
|-----|----------|
| SUPER_ADMIN | Acceso total al sistema |
| ADMIN | Gestión completa del tenant |
| COLLECTOR | Solo rutas asignadas y cobros |

---

## 🛡️ Protección de APIs

### Rate Limiting
```javascript
// Configuración de límites
{
  login: '5 intentos / 15 minutos',
  register: '3 registros / hora / IP',
  api: '100 requests / minuto',
  passwordReset: '3 intentos / hora'
}
```

### CORS (Cross-Origin Resource Sharing)
```javascript
// Producción - Solo dominios permitidos
{
  origin: ['https://prestanace.renace.tech'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}
```

### Headers de Seguridad (Helmet)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

---

## 🏢 Aislamiento Multi-Tenant

### Middleware de Tenant
Cada request valida:
1. Token JWT válido
2. Tenant activo
3. Suscripción vigente
4. Límites del plan

```javascript
// Validación en cada request
async function tenantMiddleware(req, res, next) {
  const tenant = await validateTenant(req.user.tenantId);
  if (!tenant.isActive) throw new UnauthorizedError();
  if (tenant.subscription.expiresAt < new Date()) {
    throw new SubscriptionExpiredError();
  }
  next();
}
```

### Límites por Plan
| Plan | Clientes | Préstamos | Usuarios |
|------|----------|-----------|----------|
| FREE | 10 | 5 | 1 |
| BASIC | 100 | 50 | 3 |
| PRO | 500 | 250 | 10 |
| ENTERPRISE | Ilimitado | Ilimitado | Ilimitado |

---

## 🚫 Protección Anti-Fraude

### Validación de Suscripciones
```javascript
// Verificación en cada operación crítica
async function checkSubscriptionLimits(tenantId, operation) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true }
  });
  
  // Verificar expiración
  if (tenant.subscription.expiresAt < new Date()) {
    throw new Error('SUBSCRIPTION_EXPIRED');
  }
  
  // Verificar límites
  const counts = await getResourceCounts(tenantId);
  if (counts.clients >= tenant.subscription.maxClients) {
    throw new Error('CLIENT_LIMIT_REACHED');
  }
}
```

### Detección de Manipulación
- **Checksum de transacciones**: Hash SHA-256 de datos críticos
- **Audit logs**: Registro inmutable de todas las operaciones
- **Integridad de pagos**: Validación de montos y fechas

### Prevención de Bypass
- Validación server-side de TODOS los límites
- No confiar nunca en datos del frontend
- Verificación doble de permisos
- Tokens con información mínima (solo IDs)

---

## 📝 Logs y Auditoría

### Registro de Eventos
```javascript
// Eventos auditados
- AUTH_LOGIN_SUCCESS
- AUTH_LOGIN_FAILED
- AUTH_LOGOUT
- PAYMENT_CREATED
- PAYMENT_DELETED
- LOAN_CREATED
- SETTINGS_CHANGED
- PASSWORD_RESET
- PERMISSION_CHANGED
```

### Formato de Log
```json
{
  "timestamp": "2024-12-15T12:00:00Z",
  "action": "PAYMENT_CREATED",
  "userId": "user_123",
  "tenantId": "tenant_456",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "details": { "paymentId": "pay_789", "amount": 1500 }
}
```

---

## 🔒 Seguridad de Datos

### Base de Datos
- **Conexión**: SSL/TLS obligatorio en producción
- **Backups**: Automáticos cada 6 horas
- **Encriptación**: AES-256 para datos sensibles

### Archivos
- **Imágenes**: Base64 con validación de tipo MIME
- **Tamaño máximo**: 5MB por archivo
- **Tipos permitidos**: image/jpeg, image/png, image/webp

### Comunicaciones
- **HTTPS**: Obligatorio (Let's Encrypt)
- **TLS**: Versión 1.2+ únicamente
- **Certificados**: Renovación automática

---

## 🛠️ Configuración de Producción

### Variables de Entorno Críticas
```bash
# NUNCA exponer en código
JWT_SECRET=<hash-aleatorio-64-caracteres>
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
SMTP_PASSWORD=<password-seguro>

# Configuración obligatoria
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com
```

### Checklist de Seguridad para Deploy
- [ ] Variables de entorno configuradas
- [ ] SSL/HTTPS activo
- [ ] CORS configurado correctamente
- [ ] Rate limiting activo
- [ ] Logs habilitados
- [ ] Backups automáticos
- [ ] Firewall configurado
- [ ] Ports innecesarios cerrados

---

## 🚨 Respuesta a Incidentes

### En caso de brecha de seguridad:
1. **Contención**: Desactivar accesos comprometidos
2. **Análisis**: Revisar logs de auditoría
3. **Comunicación**: Notificar usuarios afectados
4. **Remediación**: Rotar credenciales, parchear vulnerabilidad
5. **Documentación**: Registrar incidente y acciones

### Contacto de Seguridad
- **Email**: security@renace.tech
- **Respuesta**: 24-48 horas hábiles

---

## 📋 Actualizaciones de Seguridad

Este documento se actualiza con cada release. Última revisión: **v1.10 - Diciembre 2024**

### Historial
| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.10 | 2024-12 | Documento inicial completo |
