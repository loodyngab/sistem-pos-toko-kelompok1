const router = require('express').Router();
const ctrl = require('../controllers/laporan.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken, allowRoles('Owner', 'Kepala Toko', 'Bagian Keuangan', 'Akunting'));

router.get('/neraca-saldo', ah(ctrl.neracaSaldo));
router.get('/laba-rugi', ah(ctrl.labaRugi));
router.get('/kartu-stok/:id_produk', ah(ctrl.kartuStok));
router.get('/rekap-persediaan', ah(ctrl.rekapPersediaan));

module.exports = router;
