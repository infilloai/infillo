import { IStorageProvider, IAIProvider } from '../types/providers';
import { StorageProviderFactory } from '../providers/storage/StorageProviderFactory';
import { AIProviderFactory } from '../providers/ai/AIProviderFactory';
import config from '../config/env';
import logger from '../utils/logger';

class ProviderService {
  private static instance: ProviderService;
  private storageProvider: IStorageProvider | null = null;
  private aiProvider: IAIProvider | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  /**
   * Initialize providers based on configuration
   */
  async initialize(): Promise<void> {
    try {
      // Initialize storage provider
      const storageType = process.env.STORAGE_PROVIDER || 'google';
      this.storageProvider = this.createStorageProvider(storageType);
      
      // Check storage access
      const storageAccess = await this.storageProvider.checkAccess();
      if (!storageAccess) {
        logger.warn(`Storage provider ${storageType} is not accessible`);
      }

      // Initialize AI provider
      const aiType = process.env.AI_PROVIDER || 'google';
      this.aiProvider = this.createAIProvider(aiType);
      
      logger.info('Providers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize providers:', error);
      throw error;
    }
  }

  /**
   * Create storage provider based on type
   */
  private createStorageProvider(type: string): IStorageProvider {
    const factory = StorageProviderFactory.getInstance();
    
    switch (type.toLowerCase()) {
      case 'google':
      case 'gcs':
        return factory.createProvider('google', {
          bucketName: config.google.cloudStorage.bucketName,
          projectId: config.google.cloudStorage.projectId,
          keyFilename: config.google.cloudStorage.keyFilename,
          credentialsJson: config.google.cloudStorage.credentialsJson,
        });
      
      case 'aws':
      case 's3':
        // TODO: Add AWS S3 configuration
        throw new Error('AWS S3 provider not implemented yet');
      
      case 'azure':
        // TODO: Add Azure Blob Storage configuration
        throw new Error('Azure Blob Storage provider not implemented yet');
      
      default:
        throw new Error(`Unknown storage provider type: ${type}`);
    }
  }

  /**
   * Create AI provider based on type
   */
  private createAIProvider(type: string): IAIProvider {
    const factory = AIProviderFactory.getInstance();
    
    switch (type.toLowerCase()) {
      case 'google':
      case 'gemini':
        return factory.createProvider('google', {
          apiKey: config.google.aiApiKey,
          model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash',
          embeddingModel: process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004',
        });
      
      case 'openai':
        // TODO: Add OpenAI configuration
        throw new Error('OpenAI provider not implemented yet');
      
      case 'anthropic':
      case 'claude':
        // TODO: Add Anthropic configuration
        throw new Error('Anthropic provider not implemented yet');
      
      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }
  }

  /**
   * Get storage provider
   */
  getStorageProvider(): IStorageProvider {
    if (!this.storageProvider) {
      throw new Error('Storage provider not initialized');
    }
    return this.storageProvider;
  }

  /**
   * Get AI provider
   */
  getAIProvider(): IAIProvider {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }
    return this.aiProvider;
  }

  /**
   * Switch storage provider at runtime
   */
  async switchStorageProvider(type: string): Promise<void> {
    try {
      const newProvider = this.createStorageProvider(type);
      const accessible = await newProvider.checkAccess();
      
      if (!accessible) {
        throw new Error(`Storage provider ${type} is not accessible`);
      }
      
      this.storageProvider = newProvider;
      logger.info(`Switched to ${type} storage provider`);
    } catch (error) {
      logger.error(`Failed to switch storage provider to ${type}:`, error);
      throw error;
    }
  }

  /**
   * Switch AI provider at runtime
   */
  switchAIProvider(type: string): void {
    try {
      this.aiProvider = this.createAIProvider(type);
      logger.info(`Switched to ${type} AI provider`);
    } catch (error) {
      logger.error(`Failed to switch AI provider to ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get current provider types
   */
  getCurrentProviders(): { storage: string; ai: string } {
    return {
      storage: process.env.STORAGE_PROVIDER || 'google',
      ai: process.env.AI_PROVIDER || 'google',
    };
  }
}

export default ProviderService.getInstance(); 