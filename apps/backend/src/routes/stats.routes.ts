import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDashboardStats, getDetailedStats } from '../controllers/stats.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard overview statistics
router.get('/dashboard', getDashboardStats);

// Get detailed statistics for a specific data type
router.get('/detailed/:type', getDetailedStats);

export default router; 