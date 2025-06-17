import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User context validation schemas
export const userContextSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  value: z.string().min(1, 'Value is required').max(5000),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// User context update schema (partial updates allowed)
export const userContextUpdateSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100).optional(),
  value: z.string().min(1, 'Value is required').max(5000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(data => {
  // At least one field must be provided for update
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be provided for update"
});

// Form validation schemas
export const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.string().default('text'),
  value: z.string().optional(),
  context: z.string().optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

export const formDetectionSchema = z.object({
  html: z.string().min(1, 'HTML content is required'),
});

export const autofillRequestSchema = z.object({
  fields: z.array(formFieldSchema).min(1, 'At least one field is required'),
  formContext: z.string().optional(),
});

export const formFeedbackSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  previousValue: z.string(),
  correctValue: z.string().min(1, 'Correct value is required'),
});

// Chat validation schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  formId: z.string().optional(),
});

export const fieldExplainSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  value: z.string().min(1, 'Value is required'),
  formId: z.string().optional(),
});

export const fieldRefineSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  prompt: z.string().min(1, 'Prompt is required').max(1000),
  previousValue: z.string(),
});

export const formRefineSchema = z.object({
  formId: z.string().min(1, 'Form ID is required'),
  fieldName: z.string().min(1, 'Field name is required'),
  previousValue: z.string().optional(),
  contextText: z.string().max(5000, 'Context text must be less than 5000 characters').optional(),
  customPrompt: z.string().max(5000, 'Custom prompt must be less than 5000 characters').optional(),
  documentIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID')).optional(),
});

// Template validation schemas
export const formTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(100),
  fields: z.array(formFieldSchema).min(1, 'At least one field is required'),
  domain: z.string().optional(),
});

// File upload validation
export const fileUploadSchema = z.object({
  tags: z.string().optional().transform(val => 
    val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : []
  ),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ID validation
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// Validation middleware helper
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params,
      });
      
      // Separate validated data back to appropriate request properties
      Object.keys(req.body).forEach(key => {
        if (key in result) {
          req.body[key] = result[key];
        }
      });
      
      Object.keys(req.query).forEach(key => {
        if (key in result) {
          req.query[key] = result[key];
        }
      });
      
      Object.keys(req.params).forEach(key => {
        if (key in result) {
          req.params[key] = result[key];
        }
      });
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}; 