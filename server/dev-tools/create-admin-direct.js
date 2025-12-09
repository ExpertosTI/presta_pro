require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creando tenant...');

        // Crear tenant con ID fijo
        const tenantResult = await client.query(`
      INSERT INTO "Tenant" (id, name, slug, "isVerified", "createdAt", "updatedAt")
      VALUES (
        'renace-tenant-main',
        'RENACE.TECH',
        'renace-tech',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE
      SET "isVerified" = true
      RETURNING id;
    `);

        const tenantId = tenantResult.rows[0].id;
        console.log('✅ Tenant creado/actualizado:', tenantId);

        console.log('🔧 Creando usuario admin...');

        // Crear usuario admin (password: admin123)
        await client.query(`
      INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt", "updatedAt")
      VALUES (
        'admin-user-main',
        'admin@renace.tech',
        '$2b$10$fy3qKpBLXqK5oZvN8qF0Q.rkqrjOmK4xHNm/YVyJPgQXWzYhwHOOa',
        'Admin RENACE',
        'admin',
        $1,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET "passwordHash" = '$2b$10$fy3qKpBLXqK5oZvN8qF0Q.rkqrjOmK4xHNm/YVyJPgQXWzYhwHOOa',
          name = 'Admin RENACE',
          role = 'admin',
          "tenantId" = $1;
    `, [tenantId]);

        console.log('✅ Usuario admin@renace.tech creado/actualizado');

        // Verificar
        const check = await client.query(`
      SELECT u.email, u.name, u.role, t.name as tenant_name
      FROM "User" u
      JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.email = 'admin@renace.tech';
    `);

        if (check.rows.length > 0) {
            console.log('\n✨ Usuario listo:');
            console.log('   Email:', check.rows[0].email);
            console.log('   Nombre:', check.rows[0].name);
            console.log('   Role:', check.rows[0].role);
            console.log('   Tenant:', check.rows[0].tenant_name);
            console.log('\n🔑 Credenciales para login:');
            console.log('   Email: admin@renace.tech');
            console.log('   Password: admin123');
            console.log('\n🌐 Ve a http://localhost:5173 y haz login!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Detalle:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('💥 Error fatal');
        process.exit(1);
    });
