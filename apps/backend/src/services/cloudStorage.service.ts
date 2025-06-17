import providerService from './provider.service';

/**
 * Cloud Storage Service - Wrapper around storage provider
 * This maintains the existing API while using the dynamic provider system
 */
class CloudStorageService {
  /**
   * Upload a file to storage
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<string> {
    const provider = providerService.getStorageProvider();
    return provider.uploadFile(buffer, fileName, mimeType, userId);
  }

  /**
   * Download a file from storage
   */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    const provider = providerService.getStorageProvider();
    return provider.downloadFile(fileUrl);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const provider = providerService.getStorageProvider();
    return provider.deleteFile(fileUrl);
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(fileUrl: string, expirationMinutes: number = 60): Promise<string> {
    const provider = providerService.getStorageProvider();
    return provider.getSignedUrl(fileUrl, expirationMinutes);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileUrl: string): Promise<any> {
    const provider = providerService.getStorageProvider();
    return provider.getFileMetadata(fileUrl);
  }

  /**
   * Check if storage is accessible
   */
  async checkBucketAccess(): Promise<boolean> {
    const provider = providerService.getStorageProvider();
    return provider.checkAccess();
  }
}

export default new CloudStorageService(); 