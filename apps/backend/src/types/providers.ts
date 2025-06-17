import { ExtractedEntity, FormField, FieldSuggestion } from './index';

/**
 * Storage Provider Interface
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   */
  uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<string>;

  /**
   * Download a file from storage
   */
  downloadFile(fileUrl: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  deleteFile(fileUrl: string): Promise<void>;

  /**
   * Get a signed/temporary URL for file access
   */
  getSignedUrl(fileUrl: string, expirationMinutes?: number): Promise<string>;

  /**
   * Get file metadata
   */
  getFileMetadata(fileUrl: string): Promise<any>;

  /**
   * Check if storage is accessible
   */
  checkAccess(): Promise<boolean>;
}

/**
 * AI Provider Interface
 */
export interface IAIProvider {
  /**
   * Generate embedding for text
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Extract entities from text
   */
  extractEntities(text: string): Promise<ExtractedEntity[]>;

  /**
   * Analyze form fields and detect their intent
   */
  analyzeFormFields(fields: FormField[]): Promise<FormField[]>;

  /**
   * Generate autofill suggestions for form fields
   */
  generateAutofillSuggestions(
    fields: FormField[],
    userContexts: any[],
    formContext?: string
  ): Promise<FieldSuggestion[]>;

  /**
   * Generate a conversational response
   */
  generateChatResponse(
    message: string,
    context: string,
    systemPrompt?: string
  ): Promise<string>;

  /**
   * Stream a conversational response
   */
  streamChatResponse(
    message: string,
    context: string,
    onChunk: (chunk: string) => void,
    systemPrompt?: string
  ): Promise<void>;

  /**
   * Explain why a field suggestion was made
   */
  explainFieldSuggestion(
    field: FormField,
    suggestedValue: string,
    userContext: any[]
  ): Promise<string>;

  /**
   * Refine a field value based on user feedback
   */
  refineFieldValue(
    field: FormField,
    currentValue: string,
    userFeedback: string,
    userContext: any[]
  ): Promise<string>;
}

/**
 * Provider Configuration
 */
export interface IProviderConfig {
  storage: {
    provider: 'google' | 'aws' | 'azure' | 'local';
    config: any;
  };
  ai: {
    provider: 'google' | 'openai' | 'anthropic' | 'azure';
    config: any;
  };
}

/**
 * Storage Provider Factory Interface
 */
export interface IStorageProviderFactory {
  createProvider(type: string, config: any): IStorageProvider;
}

/**
 * AI Provider Factory Interface
 */
export interface IAIProviderFactory {
  createProvider(type: string, config: any): IAIProvider;
} 