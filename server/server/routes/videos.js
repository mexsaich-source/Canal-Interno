const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4|webm|ogg/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});

router.get('/:category', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM videos WHERE category = ?', [req.params.category]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No video found for this category' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticateToken, upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const { category } = req.body;
    if (!category) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Category is required' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM videos WHERE category = ?', [category]);

        if (existing.length > 0) {
            const oldFile = existing[0].filename;
            const oldPath = path.join(__dirname, '..', 'uploads', oldFile);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }

            await db.query(
                'UPDATE videos SET filename = ?, original_name = ? WHERE category = ?',
                [req.file.filename, req.file.originalname, category]
            );
        } else {
            await db.query(
                'INSERT INTO videos (category, filename, original_name) VALUES (?, ?, ?)',
                [category, req.file.filename, req.file.originalname]
            );
        }

        res.json({ message: 'Video uploaded successfully', filename: req.file.filename });
    } catch (error) {
        console.error('❌ Upload Error:', error); 
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:category', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM videos WHERE category = ?', [req.params.category]);
        if (rows.length > 0) {
            const filename = rows[0].filename;
            const filePath = path.join(__dirname, '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await db.query('DELETE FROM videos WHERE category = ?', [req.params.category]);
            res.json({ message: 'Video deleted' });
        } else {
            res.status(404).json({ message: 'No video found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
