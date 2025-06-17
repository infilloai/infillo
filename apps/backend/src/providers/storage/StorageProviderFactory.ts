import { IStorageProvider, IStorageProviderFactory } from '../../types/providers';
import { GoogleCloudStorageProvider } from './GoogleCloudStorageProvider';
import logger from '../../utils/logger';

/**
 * Factory for creating storage providers
 */
export class StorageProviderFactory implements IStorageProviderFactory {
  private static instance: StorageProviderFactory;
  private providers: Map<string, IStorageProvider> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): StorageProviderFactory {
    if (!StorageProviderFactory.instance) {
      StorageProviderFactory.instance = new StorageProviderFactory();
    }
    return StorageProviderFactory.instance;
  }

  /**
   * Create a storage provider based on type
   */
  createProvider(type: string, config: any): IStorageProvider {
    // Check if provider already exists
    const existingProvider = this.providers.get(type);
    if (existingProvider) {
      return existingProvider;
    }

    let provider: IStorageProvider;

    switch (type.toLowerCase()) {
      case 'google':
      case 'gcs':
        provider = new GoogleCloudStorageProvider(config);
        break;
      
      case 'aws':
      case 's3':
        // TODO: Implement AWS S3 provider
        throw new Error('AWS S3 provider not implemented yet');
      
      case 'azure':
        // TODO: Implement Azure Blob Storage provider
        throw new Error('Azure Blob Storage provider not implemented yet');
      
      case 'local':
        // TODO: Implement local file storage provider
        throw new Error('Local storage provider not implemented yet');
      
      default:
        throw new Error(`Unknown storage provider type: ${type}`);
    }

    // Cache the provider
    this.providers.set(type, provider);
    logger.info(`Created ${type} storage provider`);

    return provider;
  }

  /**
   * Clear all cached providers
   */
  clearProviders(): void {
    this.providers.clear();
  }
} 