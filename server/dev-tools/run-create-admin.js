const { execSync } = require('child_process');
const fs = require('fs');

// Leer la conexión de .env
require('dotenv').config();
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ DATABASE_URL no está configurado en .env');
    process.exit(1);
}

const sql = fs.readFileSync(__dirname + '/create-admin.sql', 'utf8');

console.log('🔧 Creando usuario admin en la base de datos...');
console.log('📧 Email: admin@renace.tech');
console.log('🔑 Password: admin123\n');

try {
    // Ejecutar SQL usando psql
    execSync(`psql "${dbUrl}" -c "${sql.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit'
    });

    console.log('\n✅ Usuario creado exitosamente!');
    console.log('\n🎯 Ahora puedes hacer login con:');
    console.log('   Email: admin@renace.tech');
    console.log('   Password: admin123');

} catch (error) {
    console.error('\n❌ Error ejecutando SQL');
    console.error('Puedes ejecutar manualmente el archivo create-admin.sql en tu cliente PostgreSQL');
}
