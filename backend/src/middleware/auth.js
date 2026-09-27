const jwt = require('jsonwebtoken');
require('dotenv').config();

/** Memastikan request punya token JWT yang valid. */
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id_user, id_role, nama_role, username }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
}

/**
 * Role-Based Access Control.
 * Contoh pakai: router.post('/produk', verifyToken, allowRoles('Owner','Kepala Gudang'), ctrl.create)
 */
function allowRoles(...rolesAllowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Belum login.' });
    }
    if (!rolesAllowed.includes(req.user.nama_role)) {
      return res.status(403).json({
        message: `Akses ditolak. Role '${req.user.nama_role}' tidak diizinkan untuk aksi ini.`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, allowRoles };
