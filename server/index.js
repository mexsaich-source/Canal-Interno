const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 
const dotenv = require('dotenv');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET;

app.use(cors({ origin: '*' }));
app.use(express.json());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS screens (
                id SERIAL PRIMARY KEY,
                category TEXT UNIQUE NOT NULL,
                rotation INTEGER DEFAULT 0,
                video_url TEXT DEFAULT '',
                public_id TEXT DEFAULT ''
            );
        `);

        console.log('✅ TABLAS SQL VERIFICADAS');

        await crearUsuarioSiNoExiste('Carlos', 'C_Mexsa0126');
       

    } catch (err) {
        console.error('❌ ERROR INICIALIZANDO DB:', err);
    }
};

async function crearUsuarioSiNoExiste(nombreUser, passwordUser) {
    try {
        const res = await pool.query('SELECT * FROM users WHERE username = $1', [nombreUser]);
        
        if (res.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(passwordUser, 10);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [nombreUser, hashedPassword]);
            console.log(` Usuario NUEVO creado: ${nombreUser}`);
        } else {
            console.log(`El usuario "${nombreUser}" ya existe (Saltando...)`);
        }
    } catch (err) {
        console.error(`Error creando a ${nombreUser}:`, err);
    }
}

initDB();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'hotel-screens', resource_type: 'video' },
});
const upload = multer({ storage: storage });


// LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id }, SECRET_KEY);
        res.json({ token, username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al loguear' });
    }
});

app.get('/api/screen/:category', async (req, res) => {
    const { category } = req.params;
    try {
        let result = await pool.query('SELECT * FROM screens WHERE category = $1', [category]);
        
        if (result.rows.length === 0) {
            result = await pool.query(
                'INSERT INTO screens (category, rotation, video_url) VALUES ($1, 0, \'\') RETURNING *',
                [category]
            );
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rotation/:category', async (req, res) => {
    const { category } = req.params;
    const { rotation } = req.body;
    try {
        const query = `
            INSERT INTO screens (category, rotation) VALUES ($1, $2)
            ON CONFLICT (category) DO UPDATE SET rotation = $2 RETURNING *;
        `;
        const result = await pool.query(query, [category, rotation]);
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/upload/:category', upload.single('video'), async (req, res) => {
    const { category } = req.params;
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        
        const query = `
            INSERT INTO screens (category, video_url, public_id) VALUES ($1, $2, $3)
            ON CONFLICT (category) DO UPDATE SET video_url = $2, public_id = $3 RETURNING *;
        `;
        const result = await pool.query(query, [category, req.file.path, req.file.filename]);
        
        res.json({ success: true, screen: result.rows[0] });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Error subiendo video' }); 
    }
});

app.listen(PORT, () => console.log(`SERVIDOR LISTO EN PUERTO ${PORT}`));