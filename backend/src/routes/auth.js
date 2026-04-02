const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));
router.post('/change-password', authMiddleware, authController.changePassword.bind(authController));
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

// Admin user management
router.get('/users', authMiddleware, isAdmin, authController.getUsers.bind(authController));
router.put('/users/:id', authMiddleware, isAdmin, authController.updateUser.bind(authController));
router.delete('/users/:id', authMiddleware, isAdmin, authController.deleteUser.bind(authController));
router.post('/reset-store', authMiddleware, isAdmin, authController.resetStore.bind(authController));

module.exports = router;
