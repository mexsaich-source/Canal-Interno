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
                media_type TEXT DEFAULT 'video',
                public_id TEXT DEFAULT ''
            );
            
            ALTER TABLE screens ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'video';
        `);

        console.log('✅ TABLAS SQL VERIFICADAS');

        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (process.env.ADMIN_USER) {
            await crearUsuarioSiNoExiste(adminUser, adminPass);
        } else {
            console.warn('⚠️ No se han definido ADMIN_USER y ADMIN_PASSWORD en el archivo .env. Se usarán valores por defecto inseguros.');
            await crearUsuarioSiNoExiste('admin', 'admin123');
        }

    } catch (err) {
        console.error('❌ ERROR INICIALIZANDO DB:', err);
    }
};

async function crearUsuarioSiNoExiste(nombreUser, passwordUser) {
    try {
        const res = await pool.query('SELECT * FROM users WHERE username = $1', [nombreUser]);

        const hashedPassword = await bcrypt.hash(passwordUser, 10);

        if (res.rows.length === 0) {
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [nombreUser, hashedPassword]);
            console.log(`✅ Usuario NUEVO creado: ${nombreUser}`);
        } else {
            // ACTUALIZAR SIEMPRE LA CONTRASEÑA con la del .env
            await pool.query('UPDATE users SET password = $2 WHERE username = $1', [nombreUser, hashedPassword]);
            console.log(`ℹ️ Usuario "${nombreUser}" actualizado con la configuración del .env`);
        }
    } catch (err) {
        console.error(`❌ Error gestionando a ${nombreUser}:`, err);
    }
}

initDB();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hotel-screens',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'webm']
    },
});
const upload = multer({ storage: storage });

// MIDDLEWARE DE AUTENTICACIÓN
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Acceso denegado' }); // Unauthorized

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Sesión expirada' }); // Forbidden
        req.user = user;
        next();
    });
};

// HELPER: Borrar de Cloudinary
const deleteFromCloudinary = async (publicId, mediaType) => {
    if (!publicId) return;
    try {
        const resourceType = mediaType === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`[Cloudinary] Borrado exitoso: ${publicId} (${resourceType})`);
    } catch (err) {
        console.error(`[Cloudinary] Error borrando ${publicId}:`, err);
    }
};

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
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
        console.log(`[API] Serving screen ${category}:`, result.rows[0]); // DEBUG LOG
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PROTEGIDO: Rotación
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

// PROTEGIDO: Upload
app.post('/api/upload/:category', authenticateToken, upload.single('video'), async (req, res) => {
    const { category } = req.params;
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

        // Detectar si es video o imagen
        const isImage = req.file.mimetype.startsWith('image/');
        const mediaType = isImage ? 'image' : 'video';

        // 1. Buscar si ya tenía algo para borrarlo de Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0 && prevRes.rows[0].public_id) {
            await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
        }

        const query = `
            INSERT INTO screens (category, video_url, public_id, media_type) VALUES ($1, $2, $3, $4)
            ON CONFLICT (category) DO UPDATE SET video_url = $2, public_id = $3, media_type = $4 RETURNING *;
        `;
        const result = await pool.query(query, [category, req.file.path, req.file.filename, mediaType]);

        res.json({ success: true, screen: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error subiendo archivo' });
    }
});

// NUEVO: Obtener todas las categorías
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT category FROM screens ORDER BY category ASC');
        const dbCategories = result.rows.map(r => r.category);

        // Categorías por defecto si la base está vacía o faltan
        const defaultCategories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];
        const allCategories = [...new Set([...defaultCategories, ...dbCategories])];

        res.json(allCategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NUEVO: Crear nueva categoría
app.post('/api/category', authenticateToken, async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'Nombre de categoría requerido' });

    try {
        await pool.query(
            'INSERT INTO screens (category, rotation, video_url) VALUES ($1, 0, \'\') ON CONFLICT DO NOTHING',
            [category]
        );
        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ error: 'Error creando categoría' });
    }
});

// NUEVO: Eliminar categoría
app.delete('/api/category/:category', authenticateToken, async (req, res) => {
    const { category } = req.params;

    // Protegemos las categorías por defecto
    const defaultCategories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];
    if (defaultCategories.includes(category)) {
        return res.status(403).json({ error: 'No se pueden eliminar categorías básicas' });
    }

    try {
        // Cleanup Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0 && prevRes.rows[0].public_id) {
            await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
        }

        await pool.query('DELETE FROM screens WHERE category = $1', [category]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

// NUEVO: Quitar solo el contenido (reset)
app.post('/api/screen/reset/:category', authenticateToken, async (req, res) => {
    const { category } = req.params;
    try {
        // Cleanup Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0 && prevRes.rows[0].public_id) {
            await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
        }

        await pool.query(
            'UPDATE screens SET video_url = \'\', public_id = \'\', media_type = \'video\' WHERE category = $1',
            [category]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al resetear contenido' });
    }
});

app.listen(PORT, () => console.log(`SERVIDOR LISTO EN PUERTO ${PORT}`));