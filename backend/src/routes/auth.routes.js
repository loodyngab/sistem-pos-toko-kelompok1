const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');

router.post('/login', ah(ctrl.login));
router.get('/me', verifyToken, ah(ctrl.me));

module.exports = router;
