// Form field types
export interface FormFieldData {
  label: string;
  placeholder: string;
  type?: string;
}

export interface FormFieldSet {
  [key: string]: FormFieldData;
}

export interface FormTabContent {
  title: string;
  description: string;
  fields: FormFieldSet;
}

// Page content types
export interface PageContent {
  title: string;
  description: string;
}

export interface EmptyStateContent {
  title: string;
  description: string;
  buttonText: string;
}

export interface InformationRecordsContent extends PageContent {
  emptyState: EmptyStateContent;
  searchPlaceholder: string;
}

// Information record types
export interface InformationRecord {
  id: string;
  label: string;
  value: string;
  category: 'personal' | 'contact' | 'address' | 'banking' | 'shipping';
}

// Layout types
export interface LayoutConstants {
  MAX_WIDTH: {
    FORM: number;
    RECORDS: number;
  };
  PADDING: {
    PAGE: string;
    CARD: string;
  };
  HEIGHT: {
    FORM_CARD: number;
    EMPTY_STATE: number;
  };
}

// Form types
export type FormTabType = 'contact' | 'job' | 'banking' | 'shipping'; 

// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  picture?: string;
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

// Chrome Extension API types (for web environment)
export interface ChromeRuntime {
  sendMessage: (extensionId: string, message: ExtensionMessage, callback?: (response?: any) => void) => void;
}

export interface ChromeExtensionAPI {
  runtime: ChromeRuntime;
}

export interface ExtensionMessage {
  type: string;
  data?: unknown;
}

export interface ExtensionAuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Window extension for Chrome API
declare global {
  interface Window {
    chrome?: ChromeExtensionAPI;
  }
}

// Form context types
export interface FormContext {
  type?: 'contact' | 'job_application' | 'registration' | 'survey' | 'other';
  domain?: string;
  url?: string;
  title?: string;
  position?: string;
  company?: string;
  documentEntities?: ExtractedEntity[];
  userPreferences?: Record<string, string>;
  [key: string]: unknown;
}

// Metadata types
export interface UserMetadata {
  preferences?: Record<string, string>;
  tags?: string[];
  lastAccessed?: string;
  source?: string;
  [key: string]: unknown;
}

export interface DocumentMetadata {
  uploadedBy?: string;
  processingDuration?: number;
  ocrConfidence?: number;
  documentType?: string;
  [key: string]: unknown;
}

// Provider configuration types
export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  region?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Response with pagination
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination: PaginationResponse;
}

// Form API types
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
  id?: string;
  selector?: string;
}

export interface DetectedField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  selector: string;
  value?: string;
}

export interface AutofillSuggestion {
  field: string;
  value: string;
  confidence: number;
  source: 'profile' | 'context' | 'document' | 'ai_generated';
  explanation?: string;
}

export interface FormSubmissionData {
  formId?: string;
  fields: FormField[];
  filledValues: Record<string, string>;
  domain: string;
  url: string;
  templateId?: string;
}

export interface FormHistoryItem {
  _id: string;
  formId: string;
  userId: string;
  htmlContent: string;
  url: string;
  domain: string;
  fields: FormField[];
  suggestions: Record<string, {
    value: string;
    source: string;
    confidence: number;
  }[]>;
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplate {
  _id: string;
  userId: string;
  templateName: string;
  fields: FormField[];
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormStats {
  totalForms: number;
  totalFields: number;
  totalSuggestions: number;
  avgFieldsPerForm: number;
}

export interface FormFeedback {
  field: string;
  previousValue: string;
  correctValue: string;
  timestamp: string;
}

// User Context types (matching backend structure)
export interface UserContext {
  _id: string;
  userId: string;
  key: string;
  value: string;
  tags: string[];
  embedding?: number[];
  metadata: Record<string, any>;
  source: 'manual' | 'document' | 'form';
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
  accessCount: number;
}

export interface UserContextData {
  key: string;
  value: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Document types
export interface DocumentUpload {
  tags?: string;
}

export interface ProcessedDocument {
  _id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  gcsUrl: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedText?: string;
  extractedEntities: ExtractedEntity[];
  tags: string[];
  processingError?: string;
  downloadUrl?: string;
  metadata?: DocumentMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  label?: string;
  description?: string;
}

export interface DocumentStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId?: string;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface FormAssistanceRequest {
  formFields: FormField[];
  userQuery: string;
  formContext?: FormContext;
}

// Provider types
export interface ProviderInfo {
  id: string;
  name: string;
  type: 'storage' | 'ai';
  description: string;
  isActive: boolean;
  config?: ProviderConfig;
}

export interface ProvidersConfig {
  storage: ProviderInfo;
  ai: ProviderInfo;
  available: {
    storage: ProviderInfo[];
    ai: ProviderInfo[];
  };
}

// Error types
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormLoadingState extends LoadingState {
  isDetecting?: boolean;
  isGeneratingSuggestions?: boolean;
  isSaving?: boolean;
}

export interface DocumentLoadingState extends LoadingState {
  isUploading?: boolean;
  isProcessing?: boolean;
  uploadProgress?: number;
}

// Blocked Origins types
export interface BlockedOrigin {
  id: string;
  origin: string;
  domain: string;
  createdAt: string;
}

// Dashboard Stats types
export interface DashboardStats {
  overview: {
    personalRecords: number;
    documents: number;
    forms: number;
    blockedOrigins: number;
  };
  personalRecords: {
    total: number;
    manual: number;
    fromDocuments: number;
    fromForms: number;
    mostUsed: number;
  };
  activity: {
    recentForms: number;
    totalFormSubmissions: number;
  };
  lastUpdated: string;
}

export interface DetailedStats {
  total: number;
  sources?: Record<string, number>;
  topTags?: Array<{ _id: string; count: number }>;
  recentlyUsed?: number;
  recent?: number;
  topDomains?: Array<{ _id: string; count: number }>;
}