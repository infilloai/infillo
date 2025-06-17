import mongoose, { Document, Schema } from 'mongoose';
import { ChatMessage } from '../types';

export interface IChatHistory extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  formId?: string;
  messages: ChatMessage[];
  context: {
    formFields?: Record<string, any>;
    filledValues?: Record<string, string>;
    domain?: string;
    metadata?: Record<string, any>;
  };
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  formId: String,
  metadata: Schema.Types.Mixed,
}, { _id: false });

const chatHistorySchema = new Schema<IChatHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    formId: {
      type: String,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    context: {
      type: {
        formFields: Schema.Types.Mixed,
        filledValues: {
          type: Map,
          of: String,
        },
        domain: String,
        metadata: Schema.Types.Mixed,
      },
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
chatHistorySchema.index({ userId: 1, startedAt: -1 });
chatHistorySchema.index({ userId: 1, status: 1 });
chatHistorySchema.index({ userId: 1, formId: 1 });

// Instance methods
chatHistorySchema.methods.addMessage = function(message: ChatMessage) {
  this.messages.push(message);
  return this.save();
};

chatHistorySchema.methods.updateContext = function(context: Partial<IChatHistory['context']>) {
  this.context = { ...this.context, ...context };
  return this.save();
};

chatHistorySchema.methods.complete = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

chatHistorySchema.methods.abandon = function() {
  this.status = 'abandoned';
  this.endedAt = new Date();
  return this.save();
};

// Static methods
chatHistorySchema.statics.findActiveByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ userId, status: 'active' }).sort({ startedAt: -1 });
};

chatHistorySchema.statics.findBySessionId = function(sessionId: string) {
  return this.findOne({ sessionId });
};

chatHistorySchema.statics.findRecentByUserId = function(
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.find({ userId })
    .sort({ startedAt: -1 })
    .limit(limit);
};

chatHistorySchema.statics.cleanupAbandoned = async function(hoursOld: number = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
  
  return this.updateMany(
    {
      status: 'active',
      updatedAt: { $lt: cutoffDate }
    },
    {
      status: 'abandoned',
      endedAt: new Date()
    }
  );
};

// Virtual for message count
chatHistorySchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for duration
chatHistorySchema.virtual('duration').get(function() {
  if (!this.endedAt) return null;
  return this.endedAt.getTime() - this.startedAt.getTime();
});

const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', chatHistorySchema);

export default ChatHistory; 