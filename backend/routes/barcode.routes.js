const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcode.controller');

// Generate a barcode image from text
router.get('/generate', barcodeController.generateBarcode);

module.exports = router;
