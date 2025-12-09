// Setup admin usando endpoint directo
const API_URL = 'http://localhost:4000';

async function setupAdmin() {
    try {
        console.log('🔧 Intentando crear cuenta admin vía registro...');

        const response = await fetch(`${API_URL}/api/tenants/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: 'RENACE.TECH',
                slug: 'renace-test',
                name: 'Admin RENACE',
                email: 'admin@renace.tech',
                password: '1012'
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Cuenta creada exitosamente!');
            console.log('📧 Revisa el email para verificar la cuenta');
            console.log('\n🔑 Credenciales:');
            console.log('   Email: admin@renace.tech');
            console.log('   Password: 1012');
        } else if (data.error && data.error.includes('ya existe')) {
            console.log('ℹ️  La cuenta ya existe, puedes hacer login directamente');
            console.log('\n🔑 Credenciales:');
            console.log('   Email: admin@renace.tech');
            console.log('   Password: 1012');
        } else {
            console.log('⚠️  Respuesta:', data);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Asegúrate de que el backend esté corriendo en puerto 4000');
    }
}

setupAdmin();
