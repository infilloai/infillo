import { IAIProvider, IAIProviderFactory } from '../../types/providers';
import { GoogleAIProvider } from './GoogleAIProvider';
import logger from '../../utils/logger';

/**
 * Factory for creating AI providers
 */
export class AIProviderFactory implements IAIProviderFactory {
  private static instance: AIProviderFactory;
  private providers: Map<string, IAIProvider> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Create an AI provider based on type
   */
  createProvider(type: string, config: any): IAIProvider {
    // Check if provider already exists
    const existingProvider = this.providers.get(type);
    if (existingProvider) {
      return existingProvider;
    }

    let provider: IAIProvider;

    switch (type.toLowerCase()) {
      case 'google':
      case 'gemini':
        provider = new GoogleAIProvider(config);
        break;
      
      case 'openai':
        // TODO: Implement OpenAI provider
        throw new Error('OpenAI provider not implemented yet');
      
      case 'anthropic':
      case 'claude':
        // TODO: Implement Anthropic Claude provider
        throw new Error('Anthropic Claude provider not implemented yet');
      
      case 'azure':
        // TODO: Implement Azure OpenAI provider
        throw new Error('Azure OpenAI provider not implemented yet');
      
      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }

    // Cache the provider
    this.providers.set(type, provider);
    logger.info(`Created ${type} AI provider`);

    return provider;
  }

  /**
   * Clear all cached providers
   */
  clearProviders(): void {
    this.providers.clear();
  }
} 