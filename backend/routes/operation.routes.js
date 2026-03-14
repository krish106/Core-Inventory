const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/operation.controller');

router.use(auth);
router.get('/', ctrl.getOperations);
router.post('/', ctrl.createOperation);
router.get('/:id', ctrl.getOperationById);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/validate', ctrl.validateOperation);
router.post('/:id/lines', ctrl.addLine);
router.put('/:id/lines/:lineId', ctrl.updateLine);
router.delete('/:id/lines/:lineId', ctrl.removeLine);

module.exports = router;
