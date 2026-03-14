const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ucController = require('../controllers/unitConversion.controller');

router.use(auth);
router.get('/', ucController.listConversions);
router.get('/convert', ucController.convert);
router.post('/', ucController.createConversion);
router.delete('/:id', ucController.deleteConversion);

module.exports = router;
