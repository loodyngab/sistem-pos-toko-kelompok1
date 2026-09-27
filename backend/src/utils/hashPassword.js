/**
 * Jalankan: npm run hash -- passwordAsli
 * Menghasilkan hash bcrypt untuk dimasukkan manual ke kolom `password`
 * di tabel `user` (menggantikan placeholder di database/seeder.sql).
 */
const bcrypt = require('bcryptjs');

const plain = process.argv[2];
if (!plain) {
  console.log('Cara pakai: npm run hash -- passwordAsli');
  process.exit(1);
}

bcrypt.hash(plain, 10).then((hash) => {
  console.log('Hash bcrypt:');
  console.log(hash);
});
