import { Router } from 'express';
import { 
  detectFormFields,
  saveFormSubmission,
  getFormHistory,
  getFormSubmission,
  refineField,
  getFormStats
} from '../controllers/form.controller';
import { authenticate } from '../middleware/auth';
import { 
  validate,
  formDetectionSchema,
  formRefineSchema,
  paginationSchema
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Form detection
router.post(
  '/detect',
  validate(formDetectionSchema),
  detectFormFields
);

// Form submission and history
router.post(
  '/submit',
  saveFormSubmission
);

router.get(
  '/history',
  validate(paginationSchema),
  getFormHistory
);


// Form-based refinement endpoint
router.post(
  '/refine',
  validate(formRefineSchema),
  refineField
);

// Form statistics
router.get(
  '/stats',
  getFormStats
);

router.get(
  '/:formId',
  getFormSubmission
);






export default router; 