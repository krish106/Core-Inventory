const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const returnController = require('../controllers/return.controller');

router.use(auth);
router.get('/', returnController.listReturns);
router.get('/:id', returnController.getReturn);
router.post('/', returnController.createReturn);
router.patch('/:id/status', returnController.updateReturnStatus);
router.delete('/:id', returnController.deleteReturn);

module.exports = router;
