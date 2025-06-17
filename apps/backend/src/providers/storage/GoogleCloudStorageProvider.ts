import { Storage, Bucket } from '@google-cloud/storage';
import { Readable } from 'stream';
import { IStorageProvider } from '../../types/providers';
import logger from '../../utils/logger';

export class GoogleCloudStorageProvider implements IStorageProvider {
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;

  constructor(config: {
    bucketName: string;
    projectId?: string;
    keyFilename?: string;
    credentialsJson?: string;
  }) {
    this.bucketName = config.bucketName;
    
    // Initialize Google Cloud Storage
    const storageConfig: any = {};
    
    if (config.projectId) {
      storageConfig.projectId = config.projectId;
    }
    
    // Handle credentials - priority: JSON content > key file > Application Default Credentials
    if (config.credentialsJson) {
      try {
        const credentials = JSON.parse(config.credentialsJson);
        storageConfig.credentials = credentials;
        if (credentials.project_id) {
          storageConfig.projectId = credentials.project_id;
        }
        logger.info('Using JSON credentials from environment variable');
      } catch (error) {
        logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        throw new Error('Invalid JSON credentials format');
      }
    } else if (config.keyFilename) {
      storageConfig.keyFilename = config.keyFilename;
      logger.info('Using credentials from key file');
    } else {
      logger.info('Using Application Default Credentials');
    }
    
    this.storage = new Storage(storageConfig);
    this.bucket = this.storage.bucket(this.bucketName);
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<string> {
    try {
      // Create a unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `uploads/${userId}/${timestamp}-${sanitizedFileName}`;
      
      const file = this.bucket.file(filePath);
      
      // Create a stream from the buffer
      const stream = Readable.from(buffer);
      
      // Upload the file
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(
            file.createWriteStream({
              metadata: {
                contentType: mimeType,
                metadata: {
                  userId,
                  originalName: fileName,
                  uploadedAt: new Date().toISOString(),
                },
              },
              resumable: false,
            })
          )
          .on('error', (error: Error) => {
            logger.error('Error uploading to GCS:', error);
            reject(error);
          })
          .on('finish', () => {
            resolve();
          });
      });
      
      // Return the file's GCS URL
      return `gs://${this.bucketName}/${filePath}`;
    } catch (error) {
      logger.error('Failed to upload file to GCS:', error);
      throw new Error('Failed to upload file');
    }
  }

  async downloadFile(fileUrl: string): Promise<Buffer> {
    try {
      // Extract file path from GCS URL
      const filePath = fileUrl.replace(`gs://${this.bucketName}/`, '');
      const file = this.bucket.file(filePath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('File not found');
      }
      
      // Download the file
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      logger.error('Failed to download file from GCS:', error);
      throw new Error('Failed to download file');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from GCS URL
      const filePath = fileUrl.replace(`gs://${this.bucketName}/`, '');
      const file = this.bucket.file(filePath);
      
      // Delete the file
      await file.delete();
      logger.info(`Deleted file from GCS: ${filePath}`);
    } catch (error) {
      logger.error('Failed to delete file from GCS:', error);
      throw new Error('Failed to delete file');
    }
  }

  async getSignedUrl(fileUrl: string, expirationMinutes: number = 60): Promise<string> {
    try {
      // Extract file path from GCS URL
      const filePath = fileUrl.replace(`gs://${this.bucketName}/`, '');
      const file = this.bucket.file(filePath);
      
      // Generate signed URL
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });
      
      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  async getFileMetadata(fileUrl: string): Promise<any> {
    try {
      // Extract file path from GCS URL
      const filePath = fileUrl.replace(`gs://${this.bucketName}/`, '');
      const file = this.bucket.file(filePath);
      
      // Get metadata
      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  async checkAccess(): Promise<boolean> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        logger.warn(`Bucket ${this.bucketName} does not exist`);
        return false;
      }
      
      // Try to get bucket metadata to verify access
      await this.bucket.getMetadata();
      logger.info(`Successfully connected to GCS bucket: ${this.bucketName}`);
      return true;
    } catch (error) {
      logger.error('Failed to access GCS bucket:', error);
      return false;
    }
  }
} 