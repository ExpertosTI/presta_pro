
const { PrismaClient } = require('../generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyTenant() {
    try {
        const unverifiedTenants = await prisma.tenant.findMany({
            where: { isVerified: false },
            include: { users: true }
        });

        console.log(`Found ${unverifiedTenants.length} unverified tenants.`);

        for (const tenant of unverifiedTenants) {
            console.log(`Verifying tenant: ${tenant.name} (${tenant.slug}) - Admin: ${tenant.users[0]?.email}`);

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: {
                    isVerified: true,
                    verificationToken: null,
                    verificationExpiresAt: null
                }
            });

            console.log(`✅ Tenant ${tenant.name} verified successfully!`);
        }

        if (unverifiedTenants.length === 0) {
            console.log("No unverified tenants found. Listing all tenants to check status:");
            const allTenants = await prisma.tenant.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { users: true }
            });
            allTenants.forEach(t => {
                console.log(`- ${t.name} (${t.slug}): Verified=${t.isVerified}, Admin=${t.users[0]?.email}`);
            });
        }

    } catch (error) {
        console.error('Error verifying tenant:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyTenant();
