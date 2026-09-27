const router = require('express').Router();
const ctrl = require('../controllers/stokOpname.controller');
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.use(verifyToken);
router.get('/', ah(ctrl.list));
router.post('/', allowRoles('Owner', 'Kepala Gudang'), ah(ctrl.create));

module.exports = router;
