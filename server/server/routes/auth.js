const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
   
            const [allUsers] = await db.query('SELECT count(*) as count FROM users');
            if (allUsers[0].count === 0 && username === 'admin' && password === 'admin123') {
                const hashedPassword = await bcrypt.hash(password, 10);
                await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword]);
                
                const [newUsers] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
                const user = newUsers[0];
                const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return res.json({ token, message: 'Initial admin created and logged in' });
            }

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
