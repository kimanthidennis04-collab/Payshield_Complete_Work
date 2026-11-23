const express = require('express');
const router = express.Router();
const { signup, login, logout, getMe, changePassword, updateProfile, updateOrganization, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);
router.put('/organization', authenticate, updateOrganization);

module.exports = router;
