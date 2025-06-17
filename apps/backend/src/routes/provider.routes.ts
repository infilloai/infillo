import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getCurrentProviders,
  getAvailableProviders,
  switchStorageProvider,
  switchAIProvider
} from '../controllers/provider.controller';

const router = Router();

// Get current providers configuration
router.get(
  '/current',
  authenticate,
  getCurrentProviders
);

// Get available providers
router.get(
  '/available',
  authenticate,
  getAvailableProviders
);

// Switch storage provider (admin only)
router.post(
  '/storage/switch',
  authenticate,
  switchStorageProvider
);

// Switch AI provider (admin only)
router.post(
  '/ai/switch',
  authenticate,
  switchAIProvider
);

export default router; 