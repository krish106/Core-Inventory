const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/alert.controller');

router.use(auth);
router.get('/', ctrl.getAlerts);
router.patch('/mark-all-read', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.patch('/:id/resolve', ctrl.resolveAlert);

module.exports = router;
