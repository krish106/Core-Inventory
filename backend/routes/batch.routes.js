const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const batchController = require('../controllers/batch.controller');

router.use(auth);
router.get('/', batchController.listBatches);
router.get('/expiring', batchController.getExpiringBatches);
router.get('/:id', batchController.getBatch);
router.post('/', batchController.createBatch);

module.exports = router;
