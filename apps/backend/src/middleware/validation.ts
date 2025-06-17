import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

// Auth validations
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
  handleValidationErrors,
]; 