const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id_user, u.username, u.password, u.nama_lengkap, u.is_active,
              r.id_role, r.nama_role
       FROM user u JOIN role r ON u.id_role = r.id_role
       WHERE u.username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Akun tidak aktif. Hubungi Owner.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const payload = {
      id_user: user.id_user,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      id_role: user.id_role,
      nama_role: user.nama_role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
}

/** GET /api/auth/me — cek user yang sedang login (dipakai frontend saat refresh) */
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
