import mongoose, { Document as MongooseDocument, Schema } from 'mongoose';
import { ExtractedEntity } from '../types';

export interface IDocument extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  gcsUrl: string; // Google Cloud Storage URL
  originalContent: string;
  extractedEntities: ExtractedEntity[];
  tags: string[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const extractedEntitySchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  context: String,
});

const documentSchema = new Schema<IDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'docx', 'txt'],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    gcsUrl: {
      type: String,
      required: true,
    },
    originalContent: {
      type: String,
      required: false,
      default: '',
    },
    extractedEntities: [extractedEntitySchema],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, processingStatus: 1 });
documentSchema.index({ userId: 1, tags: 1 });
documentSchema.index({ 'extractedEntities.type': 1 });

// Virtual for processed status
documentSchema.virtual('isProcessed').get(function() {
  return this.processingStatus === 'completed';
});

// Instance methods
documentSchema.methods.markAsProcessing = function() {
  this.processingStatus = 'processing';
  return this.save();
};

documentSchema.methods.markAsCompleted = function(entities: ExtractedEntity[]) {
  this.processingStatus = 'completed';
  this.extractedEntities = entities;
  return this.save();
};

documentSchema.methods.markAsFailed = function(error: string) {
  this.processingStatus = 'failed';
  this.processingError = error;
  return this.save();
};

// Static methods
documentSchema.statics.findByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

documentSchema.statics.findProcessedByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId, processingStatus: 'completed' }).sort({ createdAt: -1 });
};

const Document = mongoose.model<IDocument>('Document', documentSchema);

export default Document; 