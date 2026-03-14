const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ccController = require('../controllers/cycleCount.controller');

router.use(auth);
router.get('/', ccController.listCycleCounts);
router.get('/:id', ccController.getCycleCount);
router.post('/', ccController.createCycleCount);
router.patch('/:id/status', ccController.updateCycleCountStatus);
router.post('/:id/record', ccController.recordCount);

module.exports = router;
