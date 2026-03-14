const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const reportController = require('../controllers/report.controller');

router.use(auth);
router.get('/stock', reportController.getStockReport);
router.get('/movements', reportController.getMovementReport);
router.get('/valuation', reportController.getValuationReport);

module.exports = router;
