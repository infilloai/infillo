import { Request } from 'express';
import { IUser } from '../models/User';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Form Field Types
export interface FormField {
  name: string;
  label: string;
  type: string;
  value?: string;
  context?: string;
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

// User Context Types
export interface UserContextData {
  key: string;
  value: string;
  tags?: string[];
  embedding?: number[];
  metadata?: Record<string, any>;
}

// Document Types
export interface DocumentMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  extractedEntities?: ExtractedEntity[];
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  context?: string;
}

// Form Analysis Types
export interface FormAnalysisResult {
  fields: FormField[];
  formType?: string;
  confidence: number;
}

// Autofill Types
export interface AutofillRequest {
  fields: FormField[];
  formContext?: string;
}

export interface AutofillResponse {
  [fieldName: string]: FieldSuggestion[] | undefined;
}

export interface FieldSuggestion {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  source?: string;
  reasoning?: string;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  formId?: string;
  metadata?: Record<string, any>;
}

export interface ChatContext {
  formId?: string;
  fields?: FormField[];
  filledFields?: Record<string, string>;
  conversationHistory: ChatMessage[];
}

// Form Template Types
export interface FormTemplate {
  templateName: string;
  fields: FormField[];
  domain?: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

// Form History Types
export interface FormSubmission {
  formId: string;
  templateId?: string;
  fields: FormField[];
  filledValues: Record<string, string>;
  domain: string;
  submittedAt: Date;
  feedback?: FormFeedback[];
}

export interface FormFeedback {
  field: string;
  previousValue: string;
  correctValue: string;
  timestamp: Date;
}

// Vector Search Types
export interface VectorSearchResult {
  document: any;
  score: number;
  highlights?: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} 