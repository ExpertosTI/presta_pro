-- PASO 1: Actualizar rol del usuario a SUPER_ADMIN
-- Ejecutar en la base de datos PostgreSQL de producción

-- Primero verificar el usuario existe
SELECT id, email, role FROM "User" WHERE email = 'expertostird@gmail.com';

-- Actualizar a SUPER_ADMIN
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'expertostird@gmail.com';

-- Verificar cambio
SELECT id, email, role FROM "User" WHERE email = 'expertostird@gmail.com';
