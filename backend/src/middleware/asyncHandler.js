/**
 * asyncHandler.js
 * ---------------------------------------------------------------------
 * Membungkus controller async supaya kalau ada error (misal duplicate
 * key, koneksi database putus, dll) otomatis diteruskan ke error
 * handler di server.js — BUKAN membuat "unhandled promise rejection"
 * yang bisa mematikan seluruh proses Node.js.
 *
 * Tanpa ini, controller yang tidak punya try/catch sendiri (seperti
 * CRUD produk/kategori/dll) bisa membuat server crash total kalau
 * terjadi error yang tidak terduga, misalnya insert dengan kode_sku
 * yang sudah dipakai (unique constraint violation).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
