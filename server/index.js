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
                password TEXT NOT NULL,
                role TEXT DEFAULT 'editor',
                allowed_screens JSONB DEFAULT '[]'::jsonb,
                max_screens INTEGER DEFAULT 5
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_screens JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS max_screens INTEGER DEFAULT 5;
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
            ALTER TABLE screens ADD COLUMN IF NOT EXISTS playlist JSONB DEFAULT '[]'::jsonb;
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
            await pool.query(
                'INSERT INTO users (username, password, role, allowed_screens, max_screens) VALUES ($1, $2, $3, $4, $5)', 
                [nombreUser, hashedPassword, 'admin', '[]', 999]
            );
            console.log(`✅ Usuario NUEVO creado: ${nombreUser}`);
        } else {
            // ACTUALIZAR SIEMPRE LA CONTRASEÑA con la del .env
            await pool.query('UPDATE users SET password = $2, role = $3 WHERE username = $1', [nombreUser, hashedPassword, 'admin']);
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
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Sesión expirada' });
        
        try {
            const result = await pool.query('SELECT id, username, role, allowed_screens, max_screens FROM users WHERE id = $1', [decoded.id]);
            if (result.rows.length === 0) return res.status(403).json({ error: 'Usuario no encontrado' });
            
            req.user = result.rows[0];
            next();
        } catch (error) {
            res.status(500).json({ error: 'Error verificando usuario' });
        }
    });
};

// MIDDLEWARE: Solo Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Requiere permisos de Administrador' });
    }
};

// HELPER: Checar permiso sobre categoría
const canManageCategory = (user, category) => {
    if (user.role === 'admin') return true;
    const allowed = user.allowed_screens || [];
    return allowed.includes(category);
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

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ 
            token, 
            username, 
            role: user.role, 
            allowed_screens: user.allowed_screens,
            max_screens: user.max_screens 
        });
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
app.post('/api/upload/:category', authenticateToken, upload.array('media', 50), async (req, res) => {
    const { category } = req.params;

    if (!canManageCategory(req.user, category)) {
        return res.status(403).json({ error: 'No tienes permiso para subir contenido a esta pantalla' });
    }

    const { hasAudio, scheduleStart, scheduleEnd, showClock } = req.body;
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se subió ningún archivo' });

        // 1. Borrar si ya tenía algo para no saturar Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type, playlist FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0) {
            const oldPlaylist = prevRes.rows[0].playlist || [];
            for (const item of oldPlaylist) {
                if (item.public_id) await deleteFromCloudinary(item.public_id, item.type);
            }
            if (prevRes.rows[0].public_id && oldPlaylist.length === 0) {
                await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
            }
        }

        // Construir nueva playlist
        const newPlaylist = req.files.map(file => {
            const isImg = file.mimetype.startsWith('image/');
            return {
                url: file.path, 
                type: isImg ? 'image' : 'video',
                public_id: file.filename,
                hasAudio: isImg ? false : (hasAudio === 'true'),
                showClock: showClock === 'true',
                scheduleStart: scheduleStart || null,
                scheduleEnd: scheduleEnd || null
            };
        });

        // Retrocompatibilidad con sistemas viejos: Guardamos el primero en video_url
        const first = newPlaylist[0];

        const query = `
            INSERT INTO screens (category, video_url, public_id, media_type, playlist) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (category) DO UPDATE SET video_url = $2, public_id = $3, media_type = $4, playlist = $5 RETURNING *;
        `;
        const result = await pool.query(query, [category, first.url, first.public_id, first.type, JSON.stringify(newPlaylist)]);

        res.json({ success: true, screen: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error subiendo archivo(s)' });
    }
});

// NUEVO: Obtener todas las categorías
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT category FROM screens ORDER BY category ASC');
        const dbCategories = result.rows.map(r => r.category);

        const defaultCategories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];
        let allCategories = [...new Set([...defaultCategories, ...dbCategories])];

        // Si no es admin, filtramos solo las permitidas
        if (req.user.role !== 'admin') {
            const allowed = req.user.allowed_screens || [];
            allCategories = allCategories.filter(cat => allowed.includes(cat));
        }

        res.json(allCategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NUEVO: Crear nueva categoría
app.post('/api/category', authenticateToken, async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'Nombre de categoría requerido' });

    // Verificar límite de pantallas para editores
    if (req.user.role !== 'admin') {
        const countRes = await pool.query('SELECT count(*) FROM screens');
        const count = parseInt(countRes.rows[0].count);
        if (count >= req.user.max_screens) {
            return res.status(403).json({ error: `Has alcanzado el límite de ${req.user.max_screens} pantallas permitidas.` });
        }
    }

    try {
        await pool.query(
            'INSERT INTO screens (category, rotation, video_url) VALUES ($1, 0, \'\') ON CONFLICT DO NOTHING',
            [category]
        );

        // Si es editor, le damos permiso automático a la pantalla que creó
        if (req.user.role !== 'admin') {
            const newAllowed = [...(req.user.allowed_screens || []), category];
            await pool.query('UPDATE users SET allowed_screens = $1 WHERE id = $2', [JSON.stringify(newAllowed), req.user.id]);
        }

        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ error: 'Error creando categoría' });
    }
});

// NUEVO: Eliminar categoría
app.delete('/api/category/:category', authenticateToken, async (req, res) => {
    const { category } = req.params;

    if (!canManageCategory(req.user, category)) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta pantalla' });
    }

    // Protegemos las categorías por defecto
    const defaultCategories = ['Inicio', 'HH', 'Room Service', 'Promociones', 'Clientes'];
    if (defaultCategories.includes(category)) {
        return res.status(403).json({ error: 'No se pueden eliminar categorías básicas' });
    }

    try {
        // Cleanup Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type, playlist FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0) {
            const oldPlaylist = prevRes.rows[0].playlist || [];
            for (const item of oldPlaylist) {
                if (item.public_id) await deleteFromCloudinary(item.public_id, item.type);
            }
            if (prevRes.rows[0].public_id && oldPlaylist.length === 0) {
                await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
            }
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

    if (!canManageCategory(req.user, category)) {
        return res.status(403).json({ error: 'No tienes permiso para modificar esta pantalla' });
    }

    try {
        // Cleanup Cloudinary
        const prevRes = await pool.query('SELECT public_id, media_type, playlist FROM screens WHERE category = $1', [category]);
        if (prevRes.rows.length > 0) {
            const oldPlaylist = prevRes.rows[0].playlist || [];
            for (const item of oldPlaylist) {
                if (item.public_id) await deleteFromCloudinary(item.public_id, item.type);
            }
            if (prevRes.rows[0].public_id && oldPlaylist.length === 0) {
                await deleteFromCloudinary(prevRes.rows[0].public_id, prevRes.rows[0].media_type);
            }
        }

        await pool.query(
            'UPDATE screens SET video_url = \'\', public_id = \'\', media_type = \'video\', playlist = \'[]\'::jsonb WHERE category = $1',
            [category]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al resetear contenido' });
    }
});

// --- GESTIÓN DE USUARIOS (SOLO ADMIN) ---

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, allowed_screens, max_screens FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

app.post('/api/users', authenticateToken, isAdmin, async (req, res) => {
    const { username, password, role, allowed_screens, max_screens } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role, allowed_screens, max_screens) VALUES ($1, $2, $3, $4, $5)',
            [username, hashedPassword, role || 'editor', JSON.stringify(allowed_screens || []), max_screens || 5]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error creando usuario (puede que ya exista)' });
    }
});

app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        // Impedir borrarse a sí mismo si se desea
        if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
});

app.listen(PORT, () => console.log(`SERVIDOR LISTO EN PUERTO ${PORT}`));