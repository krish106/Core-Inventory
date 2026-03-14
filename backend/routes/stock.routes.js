const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/stock.controller');

router.use(auth);
router.get('/overview', ctrl.getStockOverview);
router.get('/ledger', ctrl.getStockLedger);
router.get('/product/:productId', ctrl.getProductStock);

module.exports = router;
