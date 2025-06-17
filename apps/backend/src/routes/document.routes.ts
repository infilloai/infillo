import { Router } from 'express';
import { 
  uploadDocument,
  getDocuments,
  getDocument,
  getDocumentStatus,
  deleteDocument,
  getExtractedEntities
} from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingle, handleUploadError } from '../middleware/upload';
import { validate, fileUploadSchema, paginationSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload document
router.post(
  '/upload',
  uploadSingle,
  validate(fileUploadSchema),
  uploadDocument,
  handleUploadError
);

// Get all documents
router.get(
  '/',
  validate(paginationSchema),
  getDocuments
);

// Get single document
router.get(
  '/:id',
  getDocument
);

// Get document processing status
router.get(
  '/:id/status',
  getDocumentStatus
);

// Delete document
router.delete(
  '/:id',
  deleteDocument
);



// Get extracted entities
router.get(
  '/entities/all',
  getExtractedEntities
);

export default router; 