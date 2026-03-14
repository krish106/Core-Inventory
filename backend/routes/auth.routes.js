const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);
router.post('/login-otp', ctrl.loginWithOtp);
router.post('/request-otp', ctrl.requestOtp);
router.post('/reset-password', ctrl.resetPassword);
router.get('/profile', auth, ctrl.getProfile);

module.exports = router;
