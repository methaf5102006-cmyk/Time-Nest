const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const tokens = new Set();

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ message: '.env mein ADMIN_PASSWORD set nahi hai' });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Password ghalat hai' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  res.json({ token });
});

function requireAdmin(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  const token = req.headers['x-admin-token'];
  if (token && tokens.has(token)) return next();
  return res.status(401).json({ message: 'Admin login zaroori hai' });
}

module.exports = { router, requireAdmin };
