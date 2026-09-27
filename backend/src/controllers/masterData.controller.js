const pool = require('../config/db');

/**
 * Factory generic CRUD untuk tabel master data sederhana
 * (kategori, supplier, pelanggan, akun, role) supaya tidak menulis
 * kode yang sama berulang-ulang untuk tiap entitas.
 */
function buildCrud({ table, pk, columns }) {
  return {
    list: async (req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${pk}`);
      res.json(rows);
    },
    getOne: async (req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Data tidak ditemukan.' });
      res.json(rows[0]);
    },
    create: async (req, res) => {
      const values = columns.map((c) => req.body[c]);
      const placeholders = columns.map(() => '?').join(', ');
      const [result] = await pool.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      res.status(201).json({ [pk]: result.insertId });
    },
    update: async (req, res) => {
      const setClause = columns.map((c) => `${c} = ?`).join(', ');
      const values = columns.map((c) => req.body[c]);
      await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${pk} = ?`, [...values, req.params.id]);
      res.json({ message: 'Data diperbarui.' });
    },
    remove: async (req, res) => {
      await pool.query(`DELETE FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
      res.json({ message: 'Data dihapus.' });
    },
  };
}

module.exports = {
  kategori: buildCrud({ table: 'kategori', pk: 'id_kategori', columns: ['nama_kategori'] }),
  supplier: buildCrud({ table: 'supplier', pk: 'id_supplier', columns: ['nama_supplier', 'kontak', 'alamat'] }),
  pelanggan: buildCrud({ table: 'pelanggan', pk: 'id_pelanggan', columns: ['nama_pelanggan', 'kontak'] }),
  akun: buildCrud({ table: 'akun', pk: 'id_akun', columns: ['kode_akun', 'nama_akun', 'jenis_akun'] }),
  role: buildCrud({ table: 'role', pk: 'id_role', columns: ['nama_role'] }),
};
