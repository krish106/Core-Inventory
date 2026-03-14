const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/warehouse.controller');

router.use(auth);
router.get('/', ctrl.getWarehouses);
router.post('/', ctrl.createWarehouse);
router.get('/:id', ctrl.getWarehouseById);
router.put('/:id', ctrl.updateWarehouse);
router.delete('/:id', ctrl.deleteWarehouse);

module.exports = router;
