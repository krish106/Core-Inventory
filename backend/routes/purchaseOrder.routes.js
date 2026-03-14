const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const poController = require('../controllers/purchaseOrder.controller');

router.use(auth);
router.get('/', poController.listPurchaseOrders);
router.get('/:id', poController.getPurchaseOrder);
router.post('/', poController.createPurchaseOrder);
router.patch('/:id/status', poController.updatePurchaseOrderStatus);
router.post('/:id/receive', poController.receivePurchaseOrder);
router.delete('/:id', poController.deletePurchaseOrder);

module.exports = router;
