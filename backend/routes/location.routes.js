const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/location.controller');

router.use(auth);
router.get('/', ctrl.getLocations);
router.post('/', ctrl.createLocation);
router.put('/:id', ctrl.updateLocation);
router.delete('/:id', ctrl.deleteLocation);

module.exports = router;
