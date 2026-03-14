const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(auth);
router.get('/kpis', ctrl.getDashboardKPIs);
router.get('/reorder-suggestions', ctrl.getReorderSuggestions);

module.exports = router;
