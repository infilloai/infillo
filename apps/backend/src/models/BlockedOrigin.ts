import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockedOrigin extends Document {
  userId: mongoose.Types.ObjectId;
  origin: string; // e.g., "https://example.com"
  domain: string; // e.g., "example.com" for easier querying
  createdAt: Date;
  updatedAt: Date;
}

const blockedOriginSchema = new Schema<IBlockedOrigin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one user can't block the same origin twice
blockedOriginSchema.index({ userId: 1, origin: 1 }, { unique: true });

// Index for efficient domain-based queries
blockedOriginSchema.index({ userId: 1, domain: 1 });

// Static method to extract domain from origin
blockedOriginSchema.statics.extractDomain = function(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname.toLowerCase();
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    const match = origin.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    return match?.[1]?.toLowerCase() || origin.toLowerCase();
  }
};

// Static method to find blocked origins by user
blockedOriginSchema.statics.findByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to check if origin is blocked
blockedOriginSchema.statics.isOriginBlocked = function(userId: mongoose.Types.ObjectId, origin: string) {
  return this.findOne({ userId, origin });
};

const BlockedOrigin = mongoose.model<IBlockedOrigin>('BlockedOrigin', blockedOriginSchema);

export default BlockedOrigin; 