-- SQL para crear usuario de prueba admin@renace.tech
-- Password: 1012

-- 1. Crear o verificar tenant
INSERT INTO "Tenant" (id, name, slug, "isVerified", "createdAt", "updatedAt")
VALUES (
  'test-tenant-renace',
  'RENACE.TECH',
  'renace-test',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Crear usuario admin
-- Hash de "1012": $2b$10$uu2Vn7b8g7m.q1e2grvvE6GTHsH8iGm.qvPtIeVgO
INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt", "updatedAt")
VALUES (
  'admin-renace-test',
  'admin@renace.tech',
  '$2b$10$uu2Vn7b8g7m.q1e2grvvE6GTHsH8iGm.qvPtIeVgO',
  'Admin RENACE',
  'admin',
  'test-tenant-renace',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET "passwordHash" = '$2b$10$uu2Vn7b8g7m.q1e2grvvE6GTHsH8iGm.qvPtIeVgO',
    name = 'Admin RENACE',
    role = 'admin';

-- Verificar
SELECT u.email, u.name, u.role, t.name as tenant_name
FROM "User" u
JOIN "Tenant" t ON u."tenantId" = t.id
WHERE u.email = 'admin@renace.tech';
