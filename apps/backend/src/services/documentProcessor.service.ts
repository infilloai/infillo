import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import logger from '../utils/logger';
import aiService from './ai.service';
import cloudStorageService from './cloudStorage.service';
import UserContext from '../models/UserContext';
import Document from '../models/Document';

import mongoose from 'mongoose';

class DocumentProcessorService {
  /**
   * Process uploaded document from Google Cloud Storage
   */
  async processDocument(
    userId: mongoose.Types.ObjectId,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number,
    gcsUrl: string,
    tags: string[] = [],
    existingDocumentId?: mongoose.Types.ObjectId
  ): Promise<void> {
    let document = null;
    
    try {
      // Extract text based on file type
      let extractedText = '';
      let fileType = '';

      switch (mimeType) {
        case 'application/pdf':
          extractedText = await this.extractTextFromPDF(buffer);
          fileType = 'pdf';
          break;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedText = await this.extractTextFromDOCX(buffer);
          fileType = 'docx';
          break;
        
        case 'text/plain':
          extractedText = buffer.toString('utf-8');
          fileType = 'txt';
          break;
        
        default:
          throw new Error('Unsupported file type');
      }


      // Use existing document or create new one
      if (existingDocumentId) {
        document = await Document.findByIdAndUpdate(existingDocumentId, {
          originalContent: extractedText,
          fileType,
          fileSize,
          gcsUrl,
          tags,
          processingStatus: 'processing'
        }, { new: true });
        
        if (!document) {
          throw new Error('Existing document not found');
        }
      } else {
        // Create document record
        document = await Document.create({
          userId,
          fileName,
          fileType,
          fileSize,
          gcsUrl,
          originalContent: extractedText,
          tags,
          processingStatus: 'processing',
        });
      }

      // Create a single user context entry for the entire document
      await this.createUserContextFromDocument(userId, extractedText, fileName, String(document._id), tags);

      // Mark document as completed
      await Document.findByIdAndUpdate(document._id, { 
        processingStatus: 'completed',
        extractedEntities: [] // Empty array since we're not extracting individual entities
      });
      
      logger.info(`Document processed successfully: ${fileName}`);
    } catch (error) {
      logger.error('Error processing document:', error);
      
      // Mark document as failed if it exists
      if (document) {
        await Document.findByIdAndUpdate(document._id, { 
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  /**
   * Extract text from PDF buffer
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  private async extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Create user context entries from document content (chunked if large)
   */
  private async createUserContextFromDocument(
    userId: mongoose.Types.ObjectId,
    documentContent: string,
    fileName: string,
    documentId: string,
    tags: string[]
  ): Promise<void> {
    try {
      const baseKey = this.generateKeyForDocument(fileName);
      const CHUNK_SIZE_THRESHOLD = 2500; // Characters threshold for chunking
      
      if (documentContent.length <= CHUNK_SIZE_THRESHOLD) {
        // Small document - store as single entry
        await this.createSingleContextEntry(userId, baseKey, documentContent, fileName, documentId, tags);
        logger.info(`Created single context entry for document: ${fileName}`);
      } else {
        // Large document - break into chunks
        const chunks = this.chunkDocumentContent(documentContent);
        await this.createChunkedContextEntries(userId, baseKey, chunks, fileName, documentId, tags);
        logger.info(`Created ${chunks.length} context chunks for document: ${fileName}`);
      }
    } catch (error) {
      logger.error('Error creating context from document:', error);
      throw new Error('Failed to create context from document');
    }
  }

  /**
   * Create a single context entry for small documents
   */
  private async createSingleContextEntry(
    userId: mongoose.Types.ObjectId,
    key: string,
    content: string,
    fileName: string,
    documentId: string,
    tags: string[]
  ): Promise<void> {
    const embedding = await aiService.generateEmbedding(content);
    
    await UserContext.create({
      userId,
      key,
      value: content,
      tags: [...tags, 'document'],
      embedding,
      metadata: {
        documentId,
        fileName,
        contentLength: content.length,
        chunkIndex: 0,
        totalChunks: 1,
        uploadedAt: new Date().toISOString()
      },
      source: 'document' as const,
    });
  }

  /**
   * Create multiple context entries for large documents
   */
  private async createChunkedContextEntries(
    userId: mongoose.Types.ObjectId,
    baseKey: string,
    chunks: string[],
    fileName: string,
    documentId: string,
    tags: string[]
  ): Promise<void> {
    const contextEntries = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      
      const key = chunks.length > 1 ? `${baseKey} (Part ${i + 1})` : baseKey;
      
      // Generate embedding for each chunk
      const embedding = await aiService.generateEmbedding(chunk);
      
      contextEntries.push({
        userId,
        key,
        value: chunk,
        tags: [...tags, 'document', 'chunk'],
        embedding,
        metadata: {
          documentId,
          fileName,
          contentLength: chunk.length,
          chunkIndex: i,
          totalChunks: chunks.length,
          uploadedAt: new Date().toISOString()
        },
        source: 'document' as const,
      });
    }
    
    // Bulk insert all chunks
    await UserContext.insertMany(contextEntries);
  }

  /**
   * Break document content into semantic chunks
   */
  private chunkDocumentContent(content: string): string[] {
    const MAX_CHUNK_SIZE = 2000; // Target chunk size in characters
    const MIN_CHUNK_SIZE = 500; // Minimum viable chunk size
    
    // First, try to split by paragraphs (double newlines)
    let chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 0);
    
    // If paragraphs are too large, split them further
    const finalChunks: string[] = [];
    
    for (const chunk of chunks) {
      if (chunk.length <= MAX_CHUNK_SIZE) {
        finalChunks.push(chunk.trim());
      } else {
        // Split large paragraphs by sentences
        const sentences = this.splitIntoSentences(chunk);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          // If adding this sentence would exceed chunk size, save current chunk
          if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
            finalChunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
        
        // Add the last chunk if it has content
        if (currentChunk.trim()) {
          finalChunks.push(currentChunk.trim());
        }
      }
    }
    
    // Ensure we don't have empty chunks and merge very small chunks
    return this.optimizeChunks(finalChunks, MIN_CHUNK_SIZE);
  }

  /**
   * Split text into sentences using basic punctuation rules
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by whitespace and capital letter
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Optimize chunks by merging small ones and ensuring quality
   */
  private optimizeChunks(chunks: string[], minSize: number): string[] {
    const optimized: string[] = [];
    let currentChunk = '';
    
    for (const chunk of chunks) {
      if (chunk.length < minSize && currentChunk.length + chunk.length < minSize * 2) {
        // Merge small chunks
        currentChunk += (currentChunk ? '\n\n' : '') + chunk;
      } else {
        // Save the current chunk if it exists
        if (currentChunk) {
          optimized.push(currentChunk);
          currentChunk = '';
        }
        
        // Add the current chunk (which is either large enough or will be merged later)
        if (chunk.length >= minSize) {
          optimized.push(chunk);
        } else {
          currentChunk = chunk;
        }
      }
    }
    
    // Add any remaining chunk
    if (currentChunk) {
      optimized.push(currentChunk);
    }
    
    return optimized.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Generate a meaningful key for a document
   */
  private generateKeyForDocument(fileName: string): string {
    // Remove file extension and clean up the name
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
    
    // Detect document type based on filename patterns
    const lowerName = nameWithoutExtension.toLowerCase();
    
    if (lowerName.includes('resume') || lowerName.includes('cv')) {
      return 'Resume';
    } else if (lowerName.includes('cover') && lowerName.includes('letter')) {
      return 'Cover Letter';
    } else if (lowerName.includes('transcript')) {
      return 'Academic Transcript';
    } else if (lowerName.includes('certificate') || lowerName.includes('certification')) {
      return 'Certificate';
    } else if (lowerName.includes('reference') || lowerName.includes('recommendation')) {
      return 'Reference Letter';
    } else {
      // Use the filename as the key, capitalized
      return nameWithoutExtension.charAt(0).toUpperCase() + nameWithoutExtension.slice(1);
    }
  }

  /**
   * Get processing status for a document
   */
  async getDocumentStatus(documentId: string): Promise<any> {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Count associated context entries
    const contextCount = await UserContext.countDocuments({
      'metadata.documentId': documentId
    });
    
    return {
      status: document.processingStatus,
      fileName: document.fileName,
      contextEntriesCreated: contextCount,
      error: document.processingError,
    };
  }

  /**
   * Delete document and its GCS file
   */
  async deleteDocument(documentId: string): Promise<void> {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete from Google Cloud Storage
    try {
      await cloudStorageService.deleteFile(document.gcsUrl);
    } catch (error) {
      logger.error('Error deleting file from GCS:', error);
      // Continue with document deletion even if GCS deletion fails
    }

    // Delete associated context entries
    try {
      const deletedCount = await UserContext.deleteMany({
        'metadata.documentId': documentId
      });
      logger.info(`Deleted ${deletedCount.deletedCount} context entries for document ${documentId}`);
    } catch (error) {
      logger.error('Error deleting context entries:', error);
      // Continue with document deletion even if context deletion fails
    }

    // Delete document record
    await document.deleteOne();
  }
}

export default new DocumentProcessorService(); 