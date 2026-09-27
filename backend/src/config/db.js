const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool: dipakai bersama di semua controller.
// promise() API supaya bisa pakai async/await langsung.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // supaya kolom DECIMAL dibaca sbg number, bukan string
});

module.exports = pool;
