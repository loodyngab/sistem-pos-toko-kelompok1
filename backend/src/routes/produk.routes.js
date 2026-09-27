const router = require('express').Router();
const ctrl = require('../controllers/produk.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken);
router.get('/', ah(ctrl.list));
router.get('/:id', ah(ctrl.getOne));
router.post('/', allowRoles('Owner', 'Kepala Gudang'), ah(ctrl.create));
router.put('/:id', allowRoles('Owner', 'Kepala Gudang'), ah(ctrl.update));
router.delete('/:id', allowRoles('Owner'), ah(ctrl.remove));

module.exports = router;
