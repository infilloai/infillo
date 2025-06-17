import { Request, Response } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import Document from '../models/Document';
import documentProcessor from '../services/documentProcessor.service';
import cloudStorageService from '../services/cloudStorage.service';
import logger from '../utils/logger';

/**
 * Upload and process a document
 */
export const uploadDocument = async (req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { tags = '' } = req.body;
    const tagArray = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    // Upload to Google Cloud Storage
    const gcsUrl = await cloudStorageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      userId.toString()
    );

    // Determine file type based on MIME type
    let fileType: string;
    if (req.file.mimetype === 'application/pdf') {
      fileType = 'pdf';
    } else if (req.file.mimetype === 'application/msword' || 
               req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileType = 'docx';
    } else if (req.file.mimetype === 'text/plain') {
      fileType = 'txt';
    } else {
      // Default to txt for other text types
      fileType = 'txt';
    }

    // Create document record immediately with basic text extraction
    const document = await Document.create({
      userId,
      fileName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      gcsUrl,
      originalContent: '', // Will be filled by background processing
      extractedEntities: [],
      tags: tagArray,
      processingStatus: 'pending',
      metadata: {
        mimeType: req.file.mimetype
      }
    });

    // Start processing in the background
    documentProcessor.processDocument(
      userId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      gcsUrl,
      tagArray,
      document._id as mongoose.Types.ObjectId // Pass the document ID for updating
    ).catch(error => {
      logger.error('Background document processing error:', error);
    });

    res.json({
      success: true,
      message: 'Document uploaded and processing started',
      data: {
        documentId: document._id, // ✅ Return documentId immediately
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        processingStatus: 'pending',
        gcsUrl
      }
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
};

/**
 * Get all user documents
 */
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = { userId };
    if (status) {
      query.processingStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-originalContent'), // Exclude content from list view
      Document.countDocuments(query)
    ]);

    // Generate signed URLs for documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const docObj = doc.toObject() as any;
        try {
          docObj.downloadUrl = await cloudStorageService.getSignedUrl(doc.gcsUrl);
        } catch (error) {
          logger.error('Error generating signed URL:', error);
          docObj.downloadUrl = null;
        }
        return docObj;
      })
    );

    res.json({
      success: true,
      data: documentsWithUrls,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents'
    });
  }
};

/**
 * Get single document by ID
 */
export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { id } = req.params;

    const document = await Document.findOne({ _id: id, userId });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    // Generate signed URL for download
    const docObj = document.toObject() as any;
    try {
      docObj.downloadUrl = await cloudStorageService.getSignedUrl(document.gcsUrl);
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      docObj.downloadUrl = null;
    }

    res.json({
      success: true,
      data: docObj
    });
  } catch (error) {
    logger.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document'
    });
  }
};

/**
 * Get document processing status
 */
export const getDocumentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
      return;
    }
    
    const status = await documentProcessor.getDocumentStatus(id);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting document status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status'
    });
  }
};

/**
 * Delete document
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
      return;
    }

    // Check if document belongs to user
    const document = await Document.findOne({ _id: id, userId });
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    // Delete document and GCS file
    await documentProcessor.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

/**
 * Get extracted entities from documents
 */
export const getExtractedEntities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { type } = req.query;

    const query: any = { 
      userId, 
      processingStatus: 'completed',
      'extractedEntities.0': { $exists: true }
    };

    const documents = await Document.find(query)
      .select('fileName extractedEntities createdAt');

    // Flatten and filter entities
    let allEntities: any[] = [];
    documents.forEach(doc => {
      doc.extractedEntities.forEach(entity => {
        if (!type || entity.type === type) {
          allEntities.push({
            ...entity,
            documentId: doc._id,
            documentName: doc.fileName,
            extractedAt: doc.createdAt
          });
        }
      });
    });

    // Sort by confidence
    allEntities.sort((a, b) => b.confidence - a.confidence);

    res.json({
      success: true,
      data: allEntities,
      total: allEntities.length
    });
  } catch (error) {
    logger.error('Error getting extracted entities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get extracted entities'
    });
  }
};

 