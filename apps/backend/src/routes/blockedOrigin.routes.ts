import express from 'express';
import {
  blockOrigin,
  unblockOrigin,
  checkOriginBlocked,
  getBlockedOrigins,
  toggleOriginBlock,
} from '../controllers/blockedOrigin.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/blocked-origins/block - Block an origin
router.post('/block', blockOrigin);

// POST /api/blocked-origins/unblock - Unblock an origin
router.post('/unblock', unblockOrigin);

// POST /api/blocked-origins/toggle - Toggle block status for an origin
router.post('/toggle', toggleOriginBlock);

// GET /api/blocked-origins/check - Check if an origin is blocked
router.get('/check', checkOriginBlocked);

// GET /api/blocked-origins - Get all blocked origins for the user
router.get('/', getBlockedOrigins);

export default router; 