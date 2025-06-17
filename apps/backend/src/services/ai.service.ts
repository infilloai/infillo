import providerService from './provider.service';
import { ExtractedEntity, FormField, FieldSuggestion } from '../types';

/**
 * AI Service - Wrapper around AI provider
 * This maintains the existing API while using the dynamic provider system
 */
class AIService {
  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const provider = providerService.getAIProvider();
    return provider.generateEmbedding(text);
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const provider = providerService.getAIProvider();
    return provider.extractEntities(text);
  }

  /**
   * Analyze form fields
   */
  async analyzeFormFields(fields: FormField[]): Promise<FormField[]> {
    const provider = providerService.getAIProvider();
    return provider.analyzeFormFields(fields);
  }

  /**
   * Generate autofill suggestions
   */
  async generateAutofillSuggestions(
    fields: FormField[],
    userContexts: any[],
    formContext?: string
  ): Promise<FieldSuggestion[]> {
    const provider = providerService.getAIProvider();
    return provider.generateAutofillSuggestions(fields, userContexts, formContext);
  }

  /**
   * Generate chat response
   */
  async generateChatResponse(
    message: string,
    context: string,
    systemPrompt?: string
  ): Promise<string> {
    const provider = providerService.getAIProvider();
    return provider.generateChatResponse(message, context, systemPrompt);
  }

  /**
   * Stream chat response
   */
  async streamChatResponse(
    message: string,
    context: string,
    onChunk: (chunk: string) => void,
    systemPrompt?: string
  ): Promise<void> {
    const provider = providerService.getAIProvider();
    return provider.streamChatResponse(message, context, onChunk, systemPrompt);
  }

  /**
   * Explain field suggestion
   */
  async explainFieldSuggestion(
    field: FormField,
    suggestedValue: string,
    userContext: any[]
  ): Promise<string> {
    const provider = providerService.getAIProvider();
    return provider.explainFieldSuggestion(field, suggestedValue, userContext);
  }

  /**
   * Refine field value
   */
  async refineFieldValue(
    field: FormField,
    currentValue: string,
    userFeedback: string,
    userContext: any[]
  ): Promise<string> {
    const provider = providerService.getAIProvider();
    return provider.refineFieldValue(field, currentValue, userFeedback, userContext);
  }
}

export default new AIService(); 