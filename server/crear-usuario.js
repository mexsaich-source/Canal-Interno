const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de la conexión (usando tu DATABASE_URL del .env)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const crearNuevoUsuario = async (nuevoUser, nuevoPass) => {
    try {
        console.log(`--- Iniciando creación de usuario: ${nuevoUser} ---`);
        
        // 1. Verificar si ya existe
        const res = await pool.query('SELECT * FROM users WHERE username = $1', [nuevoUser]);

        if (res.rows.length > 0) {
            console.log(`❌ Error: El usuario "${nuevoUser}" ya existe en la base de datos.`);
            process.exit(0);
        }

        // 2. Encriptar contraseña
        const hashedPassword = await bcrypt.hash(nuevoPass, 10);

        // 3. Insertar en la tabla
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [nuevoUser, hashedPassword]);
        
        console.log(`✅ ¡ÉXITO! Usuario "${nuevoUser}" creado correctamente.`);
        
    } catch (err) {
        console.error('❌ ERROR AL CREAR USUARIO:', err);
    } finally {
        await pool.end(); // Cerrar conexión a la DB
        process.exit(0);
    }
};

// --- CONFIGURA AQUÍ EL NUEVO USUARIO ---
const user = 'Rafael'; 
const pass = 'R_Mexsa0226';

crearNuevoUsuario(user, pass);