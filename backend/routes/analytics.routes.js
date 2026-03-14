const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

router.use(auth);

// Dead stock: items with zero movements in a period
router.get('/dead-stock', analyticsController.getDeadStock);

// Slow moving: items with low movements in a period
router.get('/slow-moving', analyticsController.getSlowMoving);

// Chart endpoints
router.get('/stock-trend', analyticsController.getStockTrend);
router.get('/top-products', analyticsController.getTopProducts);
router.get('/warehouse-comparison', analyticsController.getWarehouseComparison);
router.get('/category-breakdown', analyticsController.getCategoryBreakdown);
router.get('/operation-stats', analyticsController.getOperationStats);
router.get('/abc-classification', analyticsController.abcClassification);
router.get('/turnover-ratio', analyticsController.turnoverRatio);
router.get('/demand-forecast', analyticsController.demandForecast);

module.exports = router;
