const router = require('express').Router();
const ctrl = require('../controllers/jurnal.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken, allowRoles('Owner', 'Akunting', 'Bagian Keuangan'));
router.get('/', ah(ctrl.list));
router.get('/buku-besar/:id_akun', ah(ctrl.bukuBesar));

module.exports = router;
