/**
 * Custom React hooks for API integration
 * Provides easy access to all backend APIs with loading states and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/hooks/useAuth';
import {
  FormHistoryItem,
  FormTemplate,
  FormStats,
  UserContext,
  ProcessedDocument,
  ChatSession,
  ChatMessage,
  AutofillSuggestion,
  DetectedField,
  PaginationParams,
  PaginationResponse,
  FormField,
  FormContext,
  FormSubmissionData,
  UserContextData,
  FormFeedback,
  DocumentStatus,
  ExtractedEntity,
  FormAssistanceRequest,
  ProvidersConfig,
  LoadingState,
  FormLoadingState,
  DocumentLoadingState,
  BlockedOrigin
} from '@/types';

// Stats-related imports
import type { DashboardStats, DetailedStats } from '@/types';

// ================== FORM HOOKS ==================

/**
 * Hook for form detection
 */
export function useFormDetection() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<LoadingState & { fields: DetectedField[] }>({
    isLoading: false,
    error: null,
    fields: []
  });

  const detectFields = useCallback(async (html: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const fields = await apiService.detectFormFields(html);
      setState({ isLoading: false, error: null, fields });
      return fields;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to detect form fields';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  return { ...state, detectFields };
}

/**
 * Hook for autofill suggestions
 */
export function useAutofillSuggestions() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<LoadingState & { suggestions: AutofillSuggestion[] }>({
    isLoading: false,
    error: null,
    suggestions: []
  });

  const getSuggestions = useCallback(async (fields: FormField[], formContext?: FormContext) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const suggestions = await apiService.getAutofillSuggestions(fields, formContext);
      setState({ isLoading: false, error: null, suggestions });
      return suggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get suggestions';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  return { ...state, getSuggestions };
}

/**
 * Hook for form submission
 */
export function useFormSubmission() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<FormLoadingState>({
    isLoading: false,
    error: null,
    isSaving: false
  });

  const saveSubmission = useCallback(async (data: FormSubmissionData) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      throw new Error('Authentication required');
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));
    
    try {
      const result = await apiService.saveFormSubmission(data);
      setState({ isLoading: false, error: null, isSaving: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save form submission';
      setState(prev => ({ ...prev, isSaving: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  return { ...state, saveSubmission };
}

/**
 * Hook for form history
 */
export function useFormHistory(params: PaginationParams = {}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & {
    history: FormHistoryItem[];
    pagination: PaginationResponse;
  }>({
    isLoading: false,
    error: null,
    history: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchHistory = useCallback(async (newParams?: PaginationParams) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.getFormHistory(newParams || paramsRef.current);
      setState({
        isLoading: false,
        error: null,
        history: result.data,
        pagination: result.pagination
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch form history';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchHistory();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        history: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    }
  }, [isAuthenticated, authLoading, fetchHistory]);

  // Re-fetch when pagination parameters change
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchHistory();
    }
  }, [params.page, params.limit, isAuthenticated, authLoading, fetchHistory]);

  return { ...state, fetchHistory, refetch: fetchHistory };
}

/**
 * Hook for form templates
 */
export function useFormTemplates(domain?: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & { templates: FormTemplate[] }>({
    isLoading: false,
    error: null,
    templates: []
  });

  const domainRef = useRef(domain);
  domainRef.current = domain;

  const fetchTemplates = useCallback(async (newDomain?: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const templates = await apiService.getFormTemplates(newDomain || domainRef.current);
      setState({ isLoading: false, error: null, templates });
      return templates;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch templates';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const saveTemplate = useCallback(async (
    templateName: string,
    fields: FormField[],
    templateDomain: string
  ) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const result = await apiService.saveFormTemplate(templateName, fields, templateDomain);
      await fetchTemplates(); // Refresh templates
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchTemplates, isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchTemplates();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        templates: []
      });
    }
  }, [isAuthenticated, authLoading]);

  return { ...state, fetchTemplates, saveTemplate, refetch: fetchTemplates };
}

/**
 * Hook for form statistics
 */
export function useFormStats() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & { stats: FormStats }>({
    isLoading: false,
    error: null,
    stats: { totalForms: 0, totalFields: 0, totalSuggestions: 0, avgFieldsPerForm: 0 }
  });

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return { totalForms: 0, totalFields: 0, totalSuggestions: 0, avgFieldsPerForm: 0 };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const stats = await apiService.getFormStats();
      setState({ isLoading: false, error: null, stats });
      return stats;
    } catch (error) {
      console.warn('Failed to fetch form stats, using default values:', error);
      // Return default stats instead of throwing error to prevent UI crashes
      const defaultStats = { totalForms: 0, totalFields: 0, totalSuggestions: 0, avgFieldsPerForm: 0 };
      setState({ isLoading: false, error: null, stats: defaultStats });
      return defaultStats;
    }
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchStats();
    } else if (!authLoading && !isAuthenticated) {
      // Reset stats for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        stats: { totalForms: 0, totalFields: 0, totalSuggestions: 0, avgFieldsPerForm: 0 }
      });
    }
  }, [isAuthenticated, authLoading]);

  return { ...state, fetchStats, refetch: fetchStats };
}

// ================== USER CONTEXT HOOKS ==================

/**
 * Hook for user contexts
 */
export function useUserContexts(params: PaginationParams = {}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & {
    contexts: UserContext[];
    pagination: PaginationResponse;
  }>({
    isLoading: false,
    error: null,
    contexts: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchContexts = useCallback(async (newParams?: PaginationParams) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.getUserContexts(newParams || paramsRef.current);
      setState({
        isLoading: false,
        error: null,
        contexts: result.data,
        pagination: result.pagination
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user contexts';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const createContext = useCallback(async (data: UserContextData) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const result = await apiService.createUserContext(data);
      await fetchContexts(); // Refresh contexts
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchContexts, isAuthenticated]);

  const updateContext = useCallback(async (id: string, data: Partial<UserContextData>) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const result = await apiService.updateUserContext(id, data);
      await fetchContexts(); // Refresh contexts
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchContexts, isAuthenticated]);

  const deleteContext = useCallback(async (id: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.deleteUserContext(id);
      await fetchContexts(); // Refresh contexts
    } catch (error) {
      throw error;
    }
  }, [fetchContexts, isAuthenticated]);

  const searchContexts = useCallback(async (query: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contexts = await apiService.searchUserContexts(query);
      setState(prev => ({ ...prev, isLoading: false, error: null, contexts }));
      return contexts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contexts';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchContexts();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        contexts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    }
  }, [isAuthenticated, authLoading, fetchContexts]);

  // Re-fetch when pagination parameters change
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchContexts();
    }
  }, [params.page, params.limit, isAuthenticated, authLoading, fetchContexts]);

  return {
    ...state,
    fetchContexts,
    createContext,
    updateContext,
    deleteContext,
    searchContexts,
    refetch: fetchContexts
  };
}

// ================== DOCUMENT HOOKS ==================

/**
 * Hook for document management
 */
export function useDocuments(params: PaginationParams & { status?: string } = {}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<DocumentLoadingState & {
    documents: ProcessedDocument[];
    pagination: PaginationResponse;
  }>({
    isLoading: false,
    error: null,
    isUploading: false,
    documents: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchDocuments = useCallback(async (newParams?: PaginationParams & { status?: string }) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.getDocuments(newParams || paramsRef.current);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        documents: result.data,
        pagination: result.pagination
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch documents';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const uploadDocument = useCallback(async (file: File, tags?: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      throw new Error('Authentication required');
    }

    setState(prev => ({ ...prev, isUploading: true, error: null }));
    
    try {
      const result = await apiService.uploadDocument(file, tags);
      setState(prev => ({ ...prev, isUploading: false, error: null }));
      await fetchDocuments(); // Refresh documents
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      setState(prev => ({ ...prev, isUploading: false, error: errorMessage }));
      throw error;
    }
  }, [fetchDocuments, isAuthenticated]);

  const deleteDocument = useCallback(async (id: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.deleteDocument(id);
      await fetchDocuments(); // Refresh documents
    } catch (error) {
      throw error;
    }
  }, [fetchDocuments, isAuthenticated]);

  const getDocumentStatus = useCallback(async (id: string): Promise<DocumentStatus> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    return await apiService.getDocumentStatus(id);
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDocuments();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        isUploading: false,
        documents: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    }
  }, [isAuthenticated, authLoading, fetchDocuments]);

  // Re-fetch when pagination parameters change
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchDocuments();
    }
  }, [params.page, params.limit, params.status, isAuthenticated, authLoading, fetchDocuments]);

  return {
    ...state,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    getDocumentStatus,
    refetch: fetchDocuments
  };
}

/**
 * Hook for extracted entities
 */
export function useExtractedEntities(type?: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & { entities: ExtractedEntity[] }>({
    isLoading: false,
    error: null,
    entities: []
  });

  const typeRef = useRef(type);
  typeRef.current = type;

  const fetchEntities = useCallback(async (newType?: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const entities = await apiService.getExtractedEntities(newType || typeRef.current);
      setState({ isLoading: false, error: null, entities });
      return entities;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch entities';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchEntities();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        entities: []
      });
    }
  }, [isAuthenticated, authLoading]);

  return { ...state, fetchEntities, refetch: fetchEntities };
}

// ================== CHAT HOOKS ==================

/**
 * Hook for chat functionality
 */
export function useChat() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<LoadingState & {
    messages: ChatMessage[];
    sessions: ChatSession[];
  }>({
    isLoading: false,
    error: null,
    messages: [],
    sessions: []
  });

  const sendMessage = useCallback(async (content: string, sessionId?: string) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      throw new Error('Authentication required');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.sendMessage(content, sessionId);
      const userMessage: ChatMessage = {
        role: 'user',
        content: content,
        timestamp: new Date(),
        sessionId: response.sessionId
      };
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        sessionId: response.sessionId
      };
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null,
        messages: [...prev.messages, userMessage, assistantMessage]
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const streamMessage = useCallback(async (
    content: string,
    onChunk: (chunk: string) => void,
    sessionId?: string
  ) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      throw new Error('Authentication required');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.streamMessage(content, sessionId, onChunk);
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stream message';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return [];
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const sessions = await apiService.getRecentChatSessions();
      setState(prev => ({ ...prev, isLoading: false, error: null, sessions }));
      return sessions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chat sessions';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const getFormAssistance = useCallback(async (request: FormAssistanceRequest) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      throw new Error('Authentication required');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.getFormAssistance(request);
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get form assistance';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  return {
    ...state,
    sendMessage,
    streamMessage,
    fetchSessions,
    getFormAssistance
  };
}

// ================== PROVIDER HOOKS ==================

/**
 * Hook for provider management
 */
export function useProviders() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & { 
    config?: ProvidersConfig;
    available?: ProvidersConfig['available'];
  }>({
    isLoading: false,
    error: null
  });

  const fetchProviders = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return undefined;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const config = await apiService.getCurrentProviders();
      setState({ isLoading: false, error: null, config });
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch providers';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const fetchAvailableProviders = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const available = await apiService.getAvailableProviders();
      setState(prev => ({ ...prev, available }));
      return available;
    } catch (error) {
      throw error;
    }
  }, [isAuthenticated]);

  const switchStorageProvider = useCallback(async (providerId: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.switchStorageProvider(providerId);
      await fetchProviders(); // Refresh config
    } catch (error) {
      throw error;
    }
  }, [fetchProviders, isAuthenticated]);

  const switchAIProvider = useCallback(async (providerId: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.switchAIProvider(providerId);
      await fetchProviders(); // Refresh config
    } catch (error) {
      throw error;
    }
  }, [fetchProviders, isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchProviders();
      fetchAvailableProviders();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        config: undefined,
        available: undefined
      });
    }
  }, [isAuthenticated, authLoading]);

  return {
    ...state,
    fetchProviders,
    fetchAvailableProviders,
    switchStorageProvider,
    switchAIProvider,
    refetch: fetchProviders
  };
}

// ================== BLOCKED ORIGINS HOOKS ==================

/**
 * Hook for blocked origins management
 */
export function useBlockedOrigins(params: PaginationParams = {}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & {
    blockedOrigins: BlockedOrigin[];
    pagination: PaginationResponse;
  }>({
    isLoading: false,
    error: null,
    blockedOrigins: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchBlockedOrigins = useCallback(async (newParams?: PaginationParams) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await apiService.getBlockedOrigins(newParams || paramsRef.current);
      setState({
        isLoading: false,
        error: null,
        blockedOrigins: result.data,
        pagination: result.pagination
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blocked origins';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const toggleOriginBlock = useCallback(async (origin: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const result = await apiService.toggleOriginBlock(origin);
      await fetchBlockedOrigins(); // Refresh blocked origins
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchBlockedOrigins, isAuthenticated]);

  const blockOrigin = useCallback(async (origin: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.blockOrigin(origin);
      await fetchBlockedOrigins(); // Refresh blocked origins
    } catch (error) {
      throw error;
    }
  }, [fetchBlockedOrigins, isAuthenticated]);

  const unblockOrigin = useCallback(async (origin: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      await apiService.unblockOrigin(origin);
      await fetchBlockedOrigins(); // Refresh blocked origins
    } catch (error) {
      throw error;
    }
  }, [fetchBlockedOrigins, isAuthenticated]);

  const checkOriginBlocked = useCallback(async (origin: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    return await apiService.checkOriginBlocked(origin);
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchBlockedOrigins();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        blockedOrigins: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    }
  }, [isAuthenticated, authLoading, fetchBlockedOrigins]);

  // Re-fetch when pagination parameters change
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchBlockedOrigins();
    }
  }, [params.page, params.limit, isAuthenticated, authLoading, fetchBlockedOrigins]);

  return {
    ...state,
    fetchBlockedOrigins,
    toggleOriginBlock,
    blockOrigin,
    unblockOrigin,
    checkOriginBlocked,
    refetch: fetchBlockedOrigins
  };
}

// ================== STATS HOOKS ==================

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadingState & { stats?: DashboardStats }>({
    isLoading: false,
    error: null
  });

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return undefined;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const stats = await apiService.getDashboardStats();
      setState({ isLoading: false, error: null, stats });
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard statistics';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [isAuthenticated]);

  const getDetailedStats = useCallback(async (type: string) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      return await apiService.getDetailedStats(type);
    } catch (error) {
      throw error;
    }
  }, [isAuthenticated]);

  // Only fetch when user is authenticated and not loading
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchStats();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data for unauthenticated users
      setState({
        isLoading: false,
        error: null,
        stats: undefined
      });
    }
  }, [isAuthenticated, authLoading, fetchStats]);

  return {
    ...state,
    fetchStats,
    getDetailedStats,
    refetch: fetchStats
  };
}