// src/services/api.js
// -----------------------------------------------------------------------
// SATU-SATUNYA file yang tahu bentuk asli response backend (field
// snake_case Bahasa Indonesia). Semua komponen React tetap pakai bentuk
// data yang sudah ada (name, price, cost, stock, category, dst) — adapter
// di sini yang menerjemahkan.
//
// Ganti VITE_API_URL di file .env kalau backend jalan di port lain.
// -----------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request gagal (${res.status})`);
  }
  return data;
}

// ---- AUTH ----

export async function login(username, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.user.nama_role);
  return data.user;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

// ---- ADAPTER: bentuk backend -> bentuk yang dipakai komponen React ----

function adaptProduk(p) {
  return {
    id: p.id_produk,
    name: p.nama_produk,
    price: Number(p.harga_jual),
    cost: Number(p.harga_beli),
    stock: p.stok_sistem,
    category: p.nama_kategori,
    kode_sku: p.kode_sku, // disimpan kalau-kalau dibutuhkan nanti
  };
}

function adaptPergerakanStok(item, namaProdukMap) {
  return {
    id: item.id_pergerakan,
    date: item.tanggal,
    type: item.jenis === 'OUT' ? 'OUT' : 'IN', // ADJ diperlakukan seperti IN/OUT tergantung tanda jumlah
    product: namaProdukMap[item.id_produk] || `Produk #${item.id_produk}`,
    qty: Math.abs(item.jumlah),
    note: item.keterangan,
  };
}

// ---- PRODUK ----

export async function fetchProduk() {
  const rows = await request('/api/produk');
  return rows.map(adaptProduk);
}

// ---- TRANSAKSI: dipanggil dari AppContext.processTransaction ----

/**
 * type: 'SALE' | 'PURCHASE' | 'RETUR_SALE' | 'RETUR_PURCHASE'
 * items: [{ id, qty, cost }] (bentuk cart dari komponen React)
 * referensi: untuk retur, { id_penjualan } atau { id_pembelian }
 * Catatan: SALE & PURCHASE pakai supplier/pelanggan default (id=1),
 * karena UI Transaksi.jsx belum ada pemilihan supplier/pelanggan.
 * Sesuaikan idPelangganDefault/idSupplierDefault di bawah kalau perlu.
 */
const ID_PELANGGAN_DEFAULT = 1; // "Umum / Walk-in" dari seeder.sql
const ID_SUPPLIER_DEFAULT = 1; // "CV Sumber Rejeki" dari seeder.sql

export async function kirimTransaksi(type, items, referensi = {}) {
  const itemsBackend = items.map((i) => ({ id_produk: i.id, kuantitas: i.qty }));

  if (type === 'SALE') {
    return request('/api/penjualan/checkout', {
      method: 'POST',
      body: JSON.stringify({ id_pelanggan: ID_PELANGGAN_DEFAULT, items: itemsBackend }),
    });
  }

  if (type === 'PURCHASE') {
    const itemsPembelian = items.map((i) => ({
      id_produk: i.id,
      kuantitas: i.qty,
      harga_satuan: i.cost, // harga beli dari cart (modul Pembelian pakai field "cost")
    }));
    return request('/api/pembelian', {
      method: 'POST',
      body: JSON.stringify({ id_supplier: ID_SUPPLIER_DEFAULT, tunai: true, items: itemsPembelian }),
    });
  }

  // Retur WAJIB merujuk invoice/PO asli (backend menolak tanpa id):
  // harga & batas kuantitas diambil dari transaksi aslinya.
  if (type === 'RETUR_SALE') {
    return request('/api/retur/penjualan', {
      method: 'POST',
      body: JSON.stringify({ id_penjualan: referensi.id_penjualan, items: itemsBackend }),
    });
  }

  if (type === 'RETUR_PURCHASE') {
    return request('/api/retur/pembelian', {
      method: 'POST',
      body: JSON.stringify({ id_pembelian: referensi.id_pembelian, tunai: true, items: itemsBackend }),
    });
  }

  throw new Error(`Tipe transaksi tidak dikenal: ${type}`);
}

// ---- GUDANG: write-off dipetakan ke stok opname ----

/**
 * UI Gudang.jsx punya form "kurangi stok sebanyak X dengan alasan Y".
 * Backend butuh stok_fisik (angka akhir), bukan jumlah pengurangan —
 * jadi kita hitung dulu: stok_fisik = stok_sekarang - qty.
 * Kalau selisihnya minus, backend otomatis bikin jurnal write-off.
 */
export async function kirimWriteOff(idProduk, stokSaatIni, qtyDikurangi, catatan) {
  return request('/api/stok-opname', {
    method: 'POST',
    body: JSON.stringify({
      keterangan: catatan,
      items: [{ id_produk: idProduk, stok_fisik: stokSaatIni - qtyDikurangi }],
    }),
  });
}

// ---- LAPORAN & JURNAL ----

export async function fetchNeracaSaldo(tanggalAkhir) {
  const qs = tanggalAkhir ? `?tanggal_akhir=${tanggalAkhir}` : '';
  return request(`/api/laporan/neraca-saldo${qs}`);
}

export async function fetchLabaRugi(tanggalAwal, tanggalAkhir) {
  const params = new URLSearchParams();
  if (tanggalAwal) params.set('tanggal_awal', tanggalAwal);
  if (tanggalAkhir) params.set('tanggal_akhir', tanggalAkhir);
  return request(`/api/laporan/laba-rugi?${params.toString()}`);
}

export async function fetchJurnalUmum() {
  return request('/api/jurnal');
}

// ---- RIWAYAT TRANSAKSI (dari database, bukan state lokal) ----

export async function fetchPenjualan() {
  return request('/api/penjualan');
}

export async function fetchPembelian() {
  return request('/api/pembelian');
}

// Detail berisi items + sudah_diretur & sisa_bisa_diretur per produk
export async function fetchPenjualanDetail(id) {
  return request(`/api/penjualan/${id}`);
}

export async function fetchPembelianDetail(id) {
  return request(`/api/pembelian/${id}`);
}

export { adaptPergerakanStok };
