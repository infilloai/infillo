/**
 * Comprehensive API Service for InfilloAI Extension
 * Provides access to all backend APIs with proper authentication and error handling
 */

import { ChromeAuthService } from './chromeAuth';
import {
  ApiResponse,
  PaginationParams,
  PaginationResponse,
  DetectedField,
  FormSubmissionData,
  FormHistoryItem,
  FormStats,
  FormFeedback,
  UserContext,
  UserContextData,
  ProcessedDocument,
  DocumentStatus,
  ExtractedEntity,
  ChatMessage,
  ChatSession,
  FormAssistanceRequest,
  ProvidersConfig,
  ApiError
} from '../types/extension';
import { API_BASE_URL } from '../config/config';

export class ApiService {
  private static instance: ApiService;
  private authService: ChromeAuthService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  constructor() {
    this.authService = ChromeAuthService.getInstance();
  }

  /**
   * Make authenticated API request with error handling
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.authService.authenticatedFetch(endpoint, options);
      
      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = 'Request failed';
        
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
        } catch {
          errorMessage = errorData || `HTTP ${response.status}`;
        }
        
        const error: ApiError = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      const result: ApiResponse<T> = await response.json();
      return result;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handle file upload with FormData
   */
  private async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = await this.authService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // ================== FORM APIs ==================

  /**
   * Detect form fields and store form with initial suggestions (NEW API)
   */
  async detectForm(data: {
    html: string;
    url?: string;
    domain?: string;
  }): Promise<{
    success: boolean;
    data?: {
      formId: string;
      fields: any[];
      suggestions: Record<string, any[]>;
    };
  }> {
    try {
      const response = await this.makeRequest<{
        formId: string;
        fields: any[];
        suggestions: Record<string, any[]>;
      }>('/api/forms/detect', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('ApiService: Error detecting form:', error);
      return { success: false };
    }
  }

  /**
   * Refine form field suggestions with additional context (NEW API)
   */
  async refineFormField(data: {
    formId: string;
    fieldName: string;
    previousValue?: string;
    contextText?: string;
    customPrompt?: string;
    documentIds?: string[];
  }): Promise<{
    success: boolean;
    data?: {
      formId: string;
      fieldName: string;
      refinedSuggestions: any[];
      allSuggestions: any[];
      documentsUsed: number;
    };
  }> {
    try {
      const response = await this.makeRequest<{
        formId: string;
        fieldName: string;
        refinedSuggestions: any[];
        allSuggestions: any[];
        documentsUsed: number;
      }>('/api/forms/refine', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('ApiService: Error refining form field:', error);
      return { success: false };
    }
  }

  /**
   * Detect form fields from HTML (LEGACY - for backward compatibility)
   */
  async detectFormFields(html: string): Promise<DetectedField[]> {
    // Use the new API but return only the fields for backward compatibility
    const result = await this.detectForm({ html });
    return result.data?.fields || [];
  }

  /**
   * Upload context documents for processing
   */
  async uploadContextDocuments(formData: FormData): Promise<{ extractedText: string }> {
    // Use the existing document upload endpoint
    const files = formData.getAll('documents') as File[];
    let extractedText = '';
    
    // Upload each file using the existing document upload API
    for (const file of files) {
      try {
        await this.uploadDocument(file, 'context_enhancement');
        
        // For now, we'll extract basic text content from the file name and type
        // In a real implementation, this would be handled by the document processor
        extractedText += `Document: ${file.name} (${file.type})\n`;
      } catch (error) {
        console.warn(`Failed to upload context document ${file.name}:`, error);
      }
    }
    
    return { extractedText };
  }

  /**
   * Save form submission
   */
  async saveFormSubmission(data: FormSubmissionData): Promise<FormHistoryItem> {
    const response = await this.makeRequest<FormHistoryItem>('/api/forms/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.data) {
      throw new Error('Failed to save form submission');
    }
    
    return response.data;
  }

  /**
   * Get form submission history
   */
  async getFormHistory(params: PaginationParams = {}): Promise<{
    data: FormHistoryItem[];
    pagination: PaginationResponse<FormHistoryItem>;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<FormHistoryItem[]>(
      `/api/forms/history?${queryParams.toString()}`
    );
    
    return {
      data: response.data || [],
      pagination: (response as any).pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Get single form submission
   */
  async getFormSubmission(formId: string): Promise<FormHistoryItem> {
    const response = await this.makeRequest<FormHistoryItem>(`/api/forms/${formId}`);
    
    if (!response.data) {
      throw new Error('Form submission not found');
    }
    
    return response.data;
  }

  /**
   * Add feedback for form field
   */
  async addFormFeedback(formId: string, feedback: FormFeedback): Promise<void> {
    await this.makeRequest(`/api/forms/${formId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  /**
   * Get form statistics
   */
  async getFormStats(): Promise<FormStats> {
    const response = await this.makeRequest<FormStats>('/api/forms/stats');
    
    return response.data || {
      totalForms: 0,
      avgAccuracy: 0,
      totalCorrections: 0,
      improvementRate: 0
    };
  }

  // ================== USER CONTEXT APIs ==================

  /**
   * Create user context
   */
  async createUserContext(data: UserContextData): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>('/api/user/context', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.data) {
      throw new Error('Failed to create user context');
    }
    
    return response.data;
  }

  /**
   * Get user contexts
   */
  async getUserContexts(params: PaginationParams = {}): Promise<{
    data: UserContext[];
    pagination: PaginationResponse<UserContext>;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<UserContext[]>(
      `/api/user/context?${queryParams.toString()}`
    );
    
    return {
      data: response.data || [],
      pagination: (response as any).pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Search user contexts
   */
  async searchUserContexts(query: string): Promise<UserContext[]> {
    const response = await this.makeRequest<UserContext[]>('/api/user/context/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    
    return response.data || [];
  }

  /**
   * Get single user context
   */
  async getUserContext(id: string): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>(`/api/user/context/${id}`);
    
    if (!response.data) {
      throw new Error('User context not found');
    }
    
    return response.data;
  }

  /**
   * Update user context
   */
  async updateUserContext(id: string, data: Partial<UserContextData>): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>(`/api/user/context/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (!response.data) {
      throw new Error('Failed to update user context');
    }
    
    return response.data;
  }

  /**
   * Delete user context
   */
  async deleteUserContext(id: string): Promise<void> {
    await this.makeRequest(`/api/user/context/${id}`, {
      method: 'DELETE',
    });
  }

  // ================== DOCUMENT APIs ==================

  /**
   * Upload document
   */
  async uploadDocument(file: File, tags?: string): Promise<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUrl: string;
  }> {
    const additionalData = tags ? { tags } : undefined;
    const response = await this.uploadFile<{
      fileName: string;
      fileSize: number;
      mimeType: string;
      gcsUrl: string;
    }>('/api/context/upload', file, additionalData);
    
    if (!response.data) {
      throw new Error('Failed to upload document');
    }
    
    return response.data;
  }

  /**
   * Get documents
   */
  async getDocuments(params: PaginationParams & { status?: string } = {}): Promise<{
    data: ProcessedDocument[];
    pagination: PaginationResponse<ProcessedDocument>;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    
    const response = await this.makeRequest<ProcessedDocument[]>(
      `/api/context?${queryParams.toString()}`
    );
    
    return {
      data: response.data || [],
      pagination: (response as any).pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Get single document
   */
  async getDocument(id: string): Promise<ProcessedDocument> {
    const response = await this.makeRequest<ProcessedDocument>(`/api/context/${id}`);
    
    if (!response.data) {
      throw new Error('Document not found');
    }
    
    return response.data;
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus(id: string): Promise<DocumentStatus> {
    const response = await this.makeRequest<DocumentStatus>(`/api/context/${id}/status`);
    
    if (!response.data) {
      throw new Error('Failed to get document status');
    }
    
    return response.data;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await this.makeRequest(`/api/context/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get extracted entities from documents
   */
  async getExtractedEntities(type?: string): Promise<ExtractedEntity[]> {
    const queryParams = type ? `?type=${encodeURIComponent(type)}` : '';
    const response = await this.makeRequest<ExtractedEntity[]>(`/api/context/entities/all${queryParams}`);
    
    return response.data || [];
  }

  // ================== CHAT APIs ==================

  /**
   * Send a message and get a streamed response via Server-Sent Events (SSE).
   * @param content The message content from the user.
   * @param sessionId The current chat session ID (optional).
   * @param onMessage Callback for each message chunk received from the stream.
   * @param onError Callback for handling errors during the stream.
   * @param onClose Callback for when the stream is closed by the server.
   * @returns A Promise that resolves with a function to close the connection.
   */
  async chatStream(
    content: string,
    sessionId: string | undefined,
    onMessage: (chunk: { response: string; sessionId: string; done: boolean }) => void,
    onError: (error: ApiError) => void,
    onClose: () => void
  ): Promise<{ close: () => void }> {
    const accessToken = await this.authService.getValidAccessToken();
    if (!accessToken) {
      const error: ApiError = new Error('Authentication required');
      error.status = 401;
      onError(error);
      throw error;
    }

    const eventSource = new EventSource(`${API_BASE_URL}/api/chat/stream?content=${encodeURIComponent(content)}&sessionId=${sessionId || ''}&token=${accessToken}`);

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        onMessage(parsedData);
        if (parsedData.done) {
          eventSource.close();
          onClose();
        }
      } catch (e) {
        const error: ApiError = new Error('Failed to parse server message');
        error.status = 500;
        onError(error);
        eventSource.close();
        onClose();
      }
    };

    eventSource.onerror = () => {
      const error: ApiError = new Error('Stream connection error');
      error.status = 500;
      onError(error);
      eventSource.close();
      onClose();
    };
    
    const close = () => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
      }
    };

    return { close };
  }

  /**
   * Send chat message
   */
  async sendMessage(content: string, sessionId?: string): Promise<{
    response: string;
    sessionId: string;
  }> {
    const response = await this.makeRequest<{
      response: string;
      sessionId: string;
    }>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content, sessionId }),
    });
    
    if (!response.data) {
      throw new Error('Failed to send message');
    }
    
    return response.data;
  }

  /**
   * Get chat history
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await this.makeRequest<ChatMessage[]>(`/api/chat/session/${sessionId}/history`);
    
    return response.data || [];
  }

  /**
   * Get recent chat sessions
   */
  async getRecentChatSessions(): Promise<ChatSession[]> {
    const response = await this.makeRequest<ChatSession[]>('/api/chat/sessions');
    
    return response.data || [];
  }

  /**
   * End chat session
   */
  async endChatSession(sessionId: string): Promise<void> {
    await this.makeRequest(`/api/chat/session/${sessionId}/end`, {
      method: 'POST',
    });
  }

  /**
   * Get form assistance
   */
  async getFormAssistance(request: FormAssistanceRequest): Promise<{
    suggestions: string[];
    explanation: string;
  }> {
    const response = await this.makeRequest<{
      suggestions: string[];
      explanation: string;
    }>('/api/chat/form-assistance', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (!response.data) {
      throw new Error('Failed to get form assistance');
    }
    
    return response.data;
  }

  // ================== PROVIDER APIs ==================

  /**
   * Get current providers configuration
   */
  async getCurrentProviders(): Promise<ProvidersConfig> {
    const response = await this.makeRequest<ProvidersConfig>('/api/providers/current');
    
    if (!response.data) {
      throw new Error('Failed to get providers configuration');
    }
    
    return response.data;
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<ProvidersConfig['available']> {
    const response = await this.makeRequest<ProvidersConfig['available']>('/api/providers/available');
    
    if (!response.data) {
      throw new Error('Failed to get available providers');
    }
    
    return response.data;
  }

  /**
   * Switch storage provider (admin only)
   */
  async switchStorageProvider(providerId: string): Promise<void> {
    await this.makeRequest('/api/providers/storage/switch', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  }

  /**
   * Switch AI provider (admin only)
   */
  async switchAIProvider(providerId: string): Promise<void> {
    await this.makeRequest('/api/providers/ai/switch', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  }

  // ================== BLOCKED ORIGINS APIs ==================

  /**
   * Check if current origin is blocked
   */
  async checkOriginBlocked(origin: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ isBlocked: boolean }>(`/api/blocked-origins/check?origin=${encodeURIComponent(origin)}`);
      return response.data?.isBlocked || false;
    } catch (error) {
      console.error('ApiService: Error checking blocked origin:', error);
      return false; // Default to not blocked on error
    }
  }

  /**
   * Toggle block status for current origin
   */
  async toggleOriginBlock(origin: string): Promise<{ 
    success: boolean; 
    data: { isBlocked: boolean; origin: string; id?: string; createdAt?: string }; 
    message: string 
  }> {
    const response = await this.makeRequest<{ 
      isBlocked: boolean; 
      origin: string; 
      id?: string; 
      createdAt?: string 
    }>('/api/blocked-origins/toggle', {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
    
    if (!response.data) {
      throw new Error('Failed to toggle origin block status');
    }
    
    return {
      success: true,
      data: response.data,
      message: response.message || (response.data.isBlocked ? 'Origin blocked successfully' : 'Origin unblocked successfully')
    };
  }

  /**
   * Get all blocked origins for the user
   */
  async getBlockedOrigins(params: PaginationParams = {}): Promise<{
    blockedOrigins: Array<{
      id: string;
      origin: string;
      domain: string;
      createdAt: string;
    }>;
    pagination: PaginationResponse<any>;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<{
      blockedOrigins: Array<{
        id: string;
        origin: string;
        domain: string;
        createdAt: string;
      }>;
      pagination: PaginationResponse<any>;
    }>(`/api/blocked-origins?${queryParams.toString()}`);
    
    return response.data || { blockedOrigins: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }

  /**
   * Block an origin
   */
  async blockOrigin(origin: string): Promise<void> {
    await this.makeRequest('/api/blocked-origins/block', {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
  }

  /**
   * Unblock an origin
   */
  async unblockOrigin(origin: string): Promise<void> {
    await this.makeRequest('/api/blocked-origins/unblock', {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance(); 