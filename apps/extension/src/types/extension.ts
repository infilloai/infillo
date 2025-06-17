/**
 * Type definitions for InfilloAI Chrome Extension
 */

export interface ExtensionMessage {
  type: string;
  data?: any;
  settings?: any;
}

export interface ContentScriptMessage extends ExtensionMessage {
  type: 
    | 'SHOW_EXTENSION_UI' 
    | 'HIDE_EXTENSION_UI'
    | 'GET_PAGE_DATA'
    | 'TOGGLE_EXTENSION_UI'
    | 'AUTOFILL_FORM'
    | 'EXTRACT_FORM_DATA';
}

export interface BackgroundMessage extends ExtensionMessage {
  type:
    | 'GET_SETTINGS'
    | 'UPDATE_SETTINGS'
    | 'GET_TAB_INFO'
    | 'TOGGLE_EXTENSION_UI'
    | 'AUTHENTICATE'
    | 'LOGOUT'
    | 'GET_AUTH_STATUS';
}

export interface PageData {
  url: string;
  title: string;
  description: string;
  timestamp: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  status: string;
  favicon?: string;
}

export interface ExtensionConfig {
  name: string;
  version: string;
  description: string;
  permissions: string[];
  hostPermissions: string[];
}

export interface AnalysisResult {
  pageData: PageData;
  analysis: {
    sentiment?: string;
    keywords?: string[];
    summary?: string;
    entities?: string[];
  };
  timestamp: string;
}

export interface FormField {
  name: string;
  type: string;
  value: string;
  label?: string;
  placeholder?: string;
  id?: string;
}

export interface FormData {
  url: string;
  title: string;
  fields: FormField[];
  timestamp: string;
}

export interface AutofillProfile {
  id: string;
  name: string;
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Authentication types (matching web app)
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  picture?: string; // Google profile picture
  isEmailVerified: boolean;
  lastLogin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthData {
  user: User;
  tokens: AuthTokens;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data?: T[];
}

// Form types
export interface DetectedField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export interface FormSubmissionData {
  url: string;
  title: string;
  fields: Record<string, string>;
  timestamp: string;
}

export interface FormHistoryItem {
  id: string;
  url: string;
  title: string;
  fields: Record<string, string>;
  timestamp: string;
  accuracy?: number;
}

export interface FormStats {
  totalForms: number;
  avgAccuracy: number;
  totalCorrections: number;
  improvementRate: number;
}

export interface FormFeedback {
  fieldName: string;
  isCorrect: boolean;
  correctValue?: string;
  comment?: string;
}

// User context types
export interface UserContextData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  [key: string]: any;
}

export interface UserContext {
  id: string;
  name: string;
  data: UserContextData;
  createdAt: string;
  updatedAt: string;
}

// Document types
export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  uploadedAt: string;
  processedAt?: string;
}

export interface DocumentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  label?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface FormAssistanceRequest {
  fieldType: string;
  fieldName: string;
  context?: string;
  currentValue?: string;
}

// Provider types
export interface ProvidersConfig {
  current: {
    storage: string;
    ai: string;
  };
  available: {
    storage: string[];
    ai: string[];
  };
}

// Error type
export class ApiError extends Error {
  status?: number;
} 