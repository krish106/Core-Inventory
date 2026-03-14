const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const soController = require('../controllers/salesOrder.controller');

router.use(auth);
router.get('/', soController.listSalesOrders);
router.get('/:id', soController.getSalesOrder);
router.post('/', soController.createSalesOrder);
router.patch('/:id/status', soController.updateSalesOrderStatus);
router.post('/:id/ship', soController.shipSalesOrder);
router.delete('/:id', soController.deleteSalesOrder);

module.exports = router;
