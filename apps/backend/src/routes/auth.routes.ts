import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, refreshTokenSchema } from '../utils/validation';

const router = Router();

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/google/extension', authController.googleExtensionAuth);

// Token management
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Logout
router.post('/logout', optionalAuth, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Get current user
router.get('/me', authenticate, authController.getMe);

// Extension-to-Web App secure transfer endpoints
router.post('/transfer/store', authenticate, authController.storeTransferData);
router.post('/transfer/retrieve', authController.retrieveTransferData);

export default router; 