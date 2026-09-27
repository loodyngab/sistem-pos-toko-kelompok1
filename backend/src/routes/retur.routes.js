const router = require('express').Router();
const ctrl = require('../controllers/retur.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken);
router.post('/penjualan', allowRoles('Owner', 'Kasir', 'Sales'), ah(ctrl.returPenjualan));
router.post('/pembelian', allowRoles('Owner', 'Kepala Gudang'), ah(ctrl.returPembelian));

module.exports = router;
