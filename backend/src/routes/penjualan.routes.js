const router = require('express').Router();
const ctrl = require('../controllers/penjualan.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken);
router.get('/', ah(ctrl.list));
router.get('/:id', ah(ctrl.detail));
router.post('/checkout', allowRoles('Owner', 'Kasir', 'Sales'), ah(ctrl.checkout));

module.exports = router;
