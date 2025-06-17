/**
 * Comprehensive API Service for InfilloAI Web App
 * Provides access to all backend APIs with proper authentication and error handling
 */

import { AuthService } from './auth';
import { API_CONFIG } from './constants';
import {
  ApiResponse,
  PaginationParams,
  PaginationResponse,
  PaginatedApiResponse,
  DetectedField,
  AutofillSuggestion,
  FormSubmissionData,
  FormHistoryItem,
  FormTemplate,
  FormStats,
  FormFeedback,
  FormContext,
  UserContext,
  UserContextData,
  ProcessedDocument,
  DocumentStatus,
  ExtractedEntity,
  ChatMessage,
  ChatSession,
  FormAssistanceRequest,
  ProvidersConfig,
  ApiError,
  FormField,
  BlockedOrigin,
  DashboardStats,
  DetailedStats
} from '@/types';

export class ApiService {
  private static instance: ApiService;
  private authService: AuthService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Make authenticated API request with error handling
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.authService.authenticatedFetch(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        options
      );
      
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

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: 'include',
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
   * Detect form fields from HTML
   */
  async detectFormFields(html: string): Promise<DetectedField[]> {
    const response = await this.makeRequest<DetectedField[]>(API_CONFIG.ENDPOINTS.FORMS.DETECT, {
      method: 'POST',
      body: JSON.stringify({ html }),
    });
    
    return response.data || [];
  }

  /**
   * Get autofill suggestions for form fields
   */
  async getAutofillSuggestions(
    fields: FormField[], 
    formContext?: FormContext
  ): Promise<AutofillSuggestion[]> {
    const response = await this.makeRequest<AutofillSuggestion[]>(API_CONFIG.ENDPOINTS.FORMS.AUTOFILL, {
      method: 'POST',
      body: JSON.stringify({ fields, formContext }),
    });
    
    return response.data || [];
  }

  /**
   * Save form submission
   */
  async saveFormSubmission(data: FormSubmissionData): Promise<FormHistoryItem> {
    const response = await this.makeRequest<FormHistoryItem>(API_CONFIG.ENDPOINTS.FORMS.SUBMIT, {
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
    pagination: PaginationResponse;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<FormHistoryItem[]>(
      `${API_CONFIG.ENDPOINTS.FORMS.HISTORY}?${queryParams.toString()}`
    ) as PaginatedApiResponse<FormHistoryItem[]>;
    
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Get single form submission
   */
  async getFormSubmission(formId: string): Promise<FormHistoryItem> {
    const response = await this.makeRequest<FormHistoryItem>(`${API_CONFIG.ENDPOINTS.FORMS.BASE}/${formId}`);
    
    if (!response.data) {
      throw new Error('Form submission not found');
    }
    
    return response.data;
  }

  /**
   * Add feedback for form field
   */
  async addFormFeedback(formId: string, feedback: FormFeedback): Promise<void> {
    await this.makeRequest(`${API_CONFIG.ENDPOINTS.FORMS.BASE}/${formId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  /**
   * Explain field suggestion
   */
  async explainFieldSuggestion(field: string, value: string): Promise<{
    explanation: string;
    field: string;
    value: string;
  }> {
    const response = await this.makeRequest<{
      explanation: string;
      field: string;
      value: string;
    }>(API_CONFIG.ENDPOINTS.FORMS.EXPLAIN, {
      method: 'POST',
      body: JSON.stringify({ field, value }),
    });
    
    if (!response.data) {
      throw new Error('Failed to get explanation');
    }
    
    return response.data;
  }

  /**
   * Refine field value using AI
   */
  async refineFieldValue(
    field: string, 
    previousValue: string, 
    prompt: string
  ): Promise<{ newValue: string; field: string }> {
    const response = await this.makeRequest<{
      newValue: string;
      field: string;
    }>(API_CONFIG.ENDPOINTS.FORMS.REFINE, {
      method: 'POST',
      body: JSON.stringify({ field, previousValue, prompt }),
    });
    
    if (!response.data) {
      throw new Error('Failed to refine field value');
    }
    
    return response.data;
  }

  /**
   * Save form template
   */
  async saveFormTemplate(
    templateName: string, 
    fields: FormField[], 
    domain: string
  ): Promise<FormTemplate> {
    const response = await this.makeRequest<FormTemplate>(API_CONFIG.ENDPOINTS.FORMS.TEMPLATE, {
      method: 'POST',
      body: JSON.stringify({ templateName, fields, domain }),
    });
    
    if (!response.data) {
      throw new Error('Failed to save form template');
    }
    
    return response.data;
  }

  /**
   * Get form templates
   */
  async getFormTemplates(domain?: string): Promise<FormTemplate[]> {
    const queryParams = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    const response = await this.makeRequest<FormTemplate[]>(`${API_CONFIG.ENDPOINTS.FORMS.TEMPLATES}${queryParams}`);
    
    return response.data || [];
  }

  /**
   * Get form statistics
   */
  async getFormStats(): Promise<FormStats> {
    const response = await this.makeRequest<FormStats>(API_CONFIG.ENDPOINTS.FORMS.STATS);
    
    return response.data || {
      totalForms: 0,
      totalFields: 0,
      totalSuggestions: 0,
      avgFieldsPerForm: 0
    };
  }

  // ================== USER CONTEXT APIs ==================

  /**
   * Create user context
   */
  async createUserContext(data: UserContextData): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>(API_CONFIG.ENDPOINTS.USER_CONTEXT, {
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
    pagination: PaginationResponse;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<UserContext[]>(
      `${API_CONFIG.ENDPOINTS.USER_CONTEXT}?${queryParams.toString()}`
    ) as PaginatedApiResponse<UserContext[]>;
    
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Search user contexts
   */
  async searchUserContexts(query: string): Promise<UserContext[]> {
    const response = await this.makeRequest<UserContext[]>(`${API_CONFIG.ENDPOINTS.USER_CONTEXT}/search`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    
    return response.data || [];
  }

  /**
   * Get single user context
   */
  async getUserContext(id: string): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>(`${API_CONFIG.ENDPOINTS.USER_CONTEXT}/${id}`);
    
    if (!response.data) {
      throw new Error('User context not found');
    }
    
    return response.data;
  }

  /**
   * Update user context
   */
  async updateUserContext(id: string, data: Partial<UserContextData>): Promise<UserContext> {
    const response = await this.makeRequest<UserContext>(`${API_CONFIG.ENDPOINTS.USER_CONTEXT}/${id}`, {
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
    await this.makeRequest(`${API_CONFIG.ENDPOINTS.USER_CONTEXT}/${id}`, {
      method: 'DELETE',
    });
  }

  // ================== STATS APIs ==================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.makeRequest<DashboardStats>(API_CONFIG.ENDPOINTS.STATS.DASHBOARD);
    
    if (!response.data) {
      throw new Error('Failed to get dashboard statistics');
    }
    
    return response.data;
  }

  /**
   * Get detailed statistics for a specific type
   */
  async getDetailedStats(type: string): Promise<DetailedStats> {
    const response = await this.makeRequest<DetailedStats>(`${API_CONFIG.ENDPOINTS.STATS.DETAILED}/${type}`);
    
    if (!response.data) {
      throw new Error(`Failed to get ${type} statistics`);
    }
    
    return response.data;
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
    }>(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/upload`, file, additionalData);
    
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
    pagination: PaginationResponse;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    
    const response = await this.makeRequest<ProcessedDocument[]>(
      `${API_CONFIG.ENDPOINTS.DOCUMENTS}?${queryParams.toString()}`
    ) as PaginatedApiResponse<ProcessedDocument[]>;
    
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Get single document
   */
  async getDocument(id: string): Promise<ProcessedDocument> {
    const response = await this.makeRequest<ProcessedDocument>(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/${id}`);
    
    if (!response.data) {
      throw new Error('Document not found');
    }
    
    return response.data;
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus(id: string): Promise<DocumentStatus> {
    const response = await this.makeRequest<DocumentStatus>(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/${id}/status`);
    
    if (!response.data) {
      throw new Error('Failed to get document status');
    }
    
    return response.data;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await this.makeRequest(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get extracted entities from documents
   */
  async getExtractedEntities(type?: string): Promise<ExtractedEntity[]> {
    const queryParams = type ? `?type=${encodeURIComponent(type)}` : '';
    const response = await this.makeRequest<ExtractedEntity[]>(`${API_CONFIG.ENDPOINTS.DOCUMENTS}/entities/all${queryParams}`);
    
    return response.data || [];
  }

  // ================== CHAT APIs ==================

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
    }>(API_CONFIG.ENDPOINTS.CHAT.MESSAGE, {
      method: 'POST',
      body: JSON.stringify({ content, sessionId }),
    });
    
    if (!response.data) {
      throw new Error('Failed to send message');
    }
    
    return response.data;
  }

  /**
   * Stream chat message (for Server-Sent Events)
   */
  async streamMessage(
    content: string, 
    sessionId?: string, 
    onMessage?: (chunk: string) => void
  ): Promise<{
    response: string;
    sessionId: string;
  }> {
    const accessToken = await this.authService.getValidAccessToken();
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT.STREAM}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ content, sessionId }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `Stream failed: ${response.status}`);
    }

    // Handle Server-Sent Events
    if (response.body && onMessage) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return { response: fullResponse, sessionId: sessionId || '' };
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  onMessage(parsed.content);
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    // Fallback to regular response
    const result = await response.json();
    return result.data || { response: '', sessionId: sessionId || '' };
  }

  /**
   * Get chat history
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await this.makeRequest<ChatMessage[]>(`${API_CONFIG.ENDPOINTS.CHAT.HISTORY}/${sessionId}`);
    
    return response.data || [];
  }

  /**
   * Get recent chat sessions
   */
  async getRecentChatSessions(): Promise<ChatSession[]> {
    const response = await this.makeRequest<ChatSession[]>(API_CONFIG.ENDPOINTS.CHAT.SESSIONS);
    
    return response.data || [];
  }

  /**
   * End chat session
   */
  async endChatSession(sessionId: string): Promise<void> {
    await this.makeRequest(API_CONFIG.ENDPOINTS.CHAT.END_SESSION, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
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
    }>(API_CONFIG.ENDPOINTS.CHAT.ASSISTANCE, {
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
    const response = await this.makeRequest<ProvidersConfig>(API_CONFIG.ENDPOINTS.PROVIDERS.CURRENT);
    
    return response.data || {
      storage: { id: 'google', name: 'Google Cloud', type: 'storage', description: 'Google Cloud Storage', isActive: true },
      ai: { id: 'google', name: 'Google AI', type: 'ai', description: 'Google AI Services', isActive: true },
      available: { storage: [], ai: [] }
    };
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<ProvidersConfig['available']> {
    const response = await this.makeRequest<ProvidersConfig['available']>(API_CONFIG.ENDPOINTS.PROVIDERS.AVAILABLE);
    
    return response.data || { storage: [], ai: [] };
  }

  /**
   * Switch storage provider (admin only)
   */
  async switchStorageProvider(providerId: string): Promise<void> {
    await this.makeRequest(API_CONFIG.ENDPOINTS.PROVIDERS.SWITCH_STORAGE, {
      method: 'POST',
      body: JSON.stringify({ provider: providerId }),
    });
  }

  /**
   * Switch AI provider (admin only)
   */
  async switchAIProvider(providerId: string): Promise<void> {
    await this.makeRequest(API_CONFIG.ENDPOINTS.PROVIDERS.SWITCH_AI, {
      method: 'POST',
      body: JSON.stringify({ provider: providerId }),
    });
  }

  // ================== REST FILES APIs ==================

  /**
   * Get all REST API files for testing
   */
  async getRestFiles(): Promise<{
    name: string;
    filename: string;
    content: string;
    size: number;
    modified: string;
  }[]> {
    const response = await this.makeRequest<{
      name: string;
      filename: string;
      content: string;
      size: number;
      modified: string;
    }[]>(API_CONFIG.ENDPOINTS.REST.FILES);
    
    return response.data || [];
  }

  // ================== BLOCKED ORIGINS APIs ==================

  /**
   * Get all blocked origins for the user
   */
  async getBlockedOrigins(params: PaginationParams = {}): Promise<{
    data: BlockedOrigin[];
    pagination: PaginationResponse;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    
    const response = await this.makeRequest<{
      blockedOrigins: BlockedOrigin[];
      pagination: PaginationResponse;
    }>(`${API_CONFIG.ENDPOINTS.BLOCKED_ORIGINS.BASE}?${queryParams.toString()}`);
    
    return {
      data: response.data?.blockedOrigins || [],
      pagination: response.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * Check if an origin is blocked
   */
  async checkOriginBlocked(origin: string): Promise<boolean> {
    const response = await this.makeRequest<{ isBlocked: boolean }>(
      `${API_CONFIG.ENDPOINTS.BLOCKED_ORIGINS.CHECK}?origin=${encodeURIComponent(origin)}`
    );
    
    return response.data?.isBlocked || false;
  }

  /**
   * Toggle block status for an origin
   */
  async toggleOriginBlock(origin: string): Promise<{
    isBlocked: boolean;
    origin: string;
    id?: string;
    createdAt?: string;
  }> {
    const response = await this.makeRequest<{
      isBlocked: boolean;
      origin: string;
      id?: string;
      createdAt?: string;
    }>(API_CONFIG.ENDPOINTS.BLOCKED_ORIGINS.TOGGLE, {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
    
    if (!response.data) {
      throw new Error('Failed to toggle origin block status');
    }
    
    return response.data;
  }

  /**
   * Block an origin
   */
  async blockOrigin(origin: string): Promise<void> {
    await this.makeRequest(API_CONFIG.ENDPOINTS.BLOCKED_ORIGINS.BLOCK, {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
  }

  /**
   * Unblock an origin
   */
  async unblockOrigin(origin: string): Promise<void> {
    await this.makeRequest(API_CONFIG.ENDPOINTS.BLOCKED_ORIGINS.UNBLOCK, {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance(); 