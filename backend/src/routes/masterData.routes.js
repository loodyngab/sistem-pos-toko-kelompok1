// Route generic untuk kategori, supplier, pelanggan, akun, role
const router = require('express').Router();
const { verifyToken, allowRoles } = require('../middleware/auth');
const ah = require('../middleware/asyncHandler');
const { kategori, supplier, pelanggan, akun, role } = require('../controllers/masterData.controller');

function mount(path, ctrl, writeRoles) {
  router.use(path, verifyToken);
  router.get(path, ah(ctrl.list));
  router.get(`${path}/:id`, ah(ctrl.getOne));
  router.post(path, allowRoles(...writeRoles), ah(ctrl.create));
  router.put(`${path}/:id`, allowRoles(...writeRoles), ah(ctrl.update));
  router.delete(`${path}/:id`, allowRoles('Owner'), ah(ctrl.remove));
}

mount('/kategori', kategori, ['Owner', 'Kepala Gudang']);
mount('/supplier', supplier, ['Owner', 'Kepala Gudang']);
mount('/pelanggan', pelanggan, ['Owner', 'Kasir', 'Sales']);
mount('/akun', akun, ['Owner', 'Akunting', 'Bagian Keuangan']);
mount('/role', role, ['Owner']);

module.exports = router;
