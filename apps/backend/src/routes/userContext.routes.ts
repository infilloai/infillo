import { Router } from 'express';
import {
  createContext,
  getContexts,
  searchContexts,
  getContext,
  updateContext,
  deleteContext
} from '../controllers/userContext.controller';
import { authenticate } from '../middleware/auth';
import { validate, userContextSchema, userContextUpdateSchema, paginationSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create or update context
router.post(
  '/context',
  validate(userContextSchema),
  createContext
);

// Get all contexts
router.get(
  '/context',
  validate(paginationSchema),
  getContexts
);

// Search contexts by similarity
router.post(
  '/context/search',
  searchContexts
);

// Get single context
router.get(
  '/context/:id',
  getContext
);

// Update context
router.put(
  '/context/:id',
  validate(userContextUpdateSchema),
  updateContext
);

// Delete context
router.delete(
  '/context/:id',
  deleteContext
);

export default router;