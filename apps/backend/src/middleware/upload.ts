import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import config from '../config/env';
import logger from '../utils/logger';

// Configure memory storage for GCS uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Check file type
  if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
    return;
  }
  
  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1 // Only allow one file at a time
  }
});

// Error handling middleware
export const handleUploadError = (error: any, _req: Request, res: any, _next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
        maxSize: `${config.upload.maxFileSize / 1024 / 1024}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name'
      });
    }
  }
  
  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      allowedTypes: ['PDF', 'DOCX', 'TXT']
    });
  }
  
  logger.error('Upload error:', error);
  return res.status(500).json({
    success: false,
    message: 'Upload failed'
  });
};

// Export configured upload middleware
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 5);
export default upload; 