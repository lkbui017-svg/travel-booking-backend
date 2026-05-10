const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const authController = require('../controllers/authController');

/**
 * POST /api/auth/register
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/google
 */
router.post('/google', authController.googleLogin);

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * PUT /api/auth/profile
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * PUT /api/auth/password
 */
router.put('/password', authenticate, authController.changePassword);

module.exports = router;
