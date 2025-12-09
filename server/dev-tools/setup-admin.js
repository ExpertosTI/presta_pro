require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createUser() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creando tenant y usuario...');

        // Crear tenant
        await client.query(`
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
    `);
        console.log('✅ Tenant creado/verificado');

        // Crear usuario
        await client.query(`
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
    `);
        console.log('✅ Usuario creado/actualizado');

        // Verificar
        const result = await client.query(`
      SELECT u.email, u.name, u.role, t.name as tenant_name
      FROM "User" u
      JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.email = 'admin@renace.tech';
    `);

        console.log('\n✨ Usuario listo:');
        console.log('   Email:', result.rows[0].email);
        console.log('   Name:', result.rows[0].name);
        console.log('   Role:', result.rows[0].role);
        console.log('   Tenant:', result.rows[0].tenant_name);
        console.log('\n🔑 Credenciales:');
        console.log('   Email: admin@renace.tech');
        console.log('   Password: 1012');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createUser()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('💥 Error fatal:', err);
        process.exit(1);
    });
