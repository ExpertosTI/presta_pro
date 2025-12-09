// Script para crear usuario de prueba
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createTestUser() {
    try {
        console.log('🔧 Creando usuario de prueba...');

        // Verificar si ya existe
        const existing = await prisma.user.findUnique({
            where: { email: 'admin@renace.tech' }
        });

        if (existing) {
            console.log('✅ El usuario admin@renace.tech ya existe');
            console.log('   Tenant:', existing.tenantId);
            await prisma.$disconnect();
            await pool.end();
            return;
        }

        // Buscar o crear tenant
        let tenant = await prisma.tenant.findFirst({
            where: { slug: 'renace-test' }
        });

        if (!tenant) {
            console.log('📦 Creando tenant de prueba...');
            tenant = await prisma.tenant.create({
                data: {
                    name: 'RENACE.TECH',
                    slug: 'renace-test',
                    isVerified: true,
                }
            });
            console.log('✅ Tenant creado:', tenant.id);
        } else {
            console.log('✅ Usando tenant existente:', tenant.id);
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash('1012', 10);

        // Crear usuario
        const user = await prisma.user.create({
            data: {
                email: 'admin@renace.tech',
                passwordHash: passwordHash,
                name: 'Admin RENACE',
                role: 'admin',
                tenantId: tenant.id
            }
        });

        console.log('✅ Usuario creado exitosamente!');
        console.log('   Email:', user.email);
        console.log('   Password: 1012');
        console.log('   Role:', user.role);
        console.log('   Tenant:', tenant.name);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

createTestUser()
    .then(() => {
        console.log('\n✨ Listo! Puedes hacer login con:');
        console.log('   Email: admin@renace.tech');
        console.log('   Password: 1012');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
