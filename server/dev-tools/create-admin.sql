-- SQL para crear usuario admin@renace.tech
-- Password: admin123

-- 1. Crear tenant
INSERT INTO "Tenant" (id, name, slug, "isVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'RENACE.TECH',
  'renace-tech',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- 2. Obtener el tenant ID y crear usuario
WITH tenant_id AS (
  SELECT id FROM "Tenant" WHERE slug = 'renace-tech'
)
INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'admin@renace.tech',
  '$2b$10$fy3qKpBLXqK5oZvN8qF0Q.rkqrjOmK4xHNm/YVyJPgQXWzYhwHOOa',
  'Admin RENACE',
  'admin',
  id,
  NOW(),
  NOW()
FROM tenant_id
ON CONFLICT (email) DO UPDATE
SET "passwordHash" = '$2b$10$fy3qKpBLXqK5oZvN8qF0Q.rkqrjOmK4xHNm/YVyJPgQXWzYhwHOOa',
    name = 'Admin RENACE',
    role = 'admin';
