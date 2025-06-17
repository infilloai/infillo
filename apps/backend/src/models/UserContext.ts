import mongoose, { Document, Schema } from 'mongoose';

export interface IUserContext extends Document {
  userId: mongoose.Types.ObjectId;
  key: string;
  value: string;
  tags: string[];
  embedding: number[];
  metadata: Record<string, any>;
  source: 'manual' | 'document' | 'form';
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

const userContextSchema = new Schema<IUserContext>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    value: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length === 768; // Standard embedding size
        },
        message: 'Embedding must have exactly 768 dimensions'
      }
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      enum: ['manual', 'document', 'form'],
      default: 'manual',
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
userContextSchema.index({ userId: 1, key: 1 });
userContextSchema.index({ userId: 1, tags: 1 });
userContextSchema.index({ userId: 1, source: 1 });
userContextSchema.index({ userId: 1, lastAccessed: -1 });

// Note: Vector search index should be created manually in MongoDB Atlas
// For Atlas Search Index:
// {
//   "name": "vector_index",
//   "definition": {
//     "fields": [
//       {
//         "type": "vector",
//         "path": "embedding",
//         "numDimensions": 768,
//         "similarity": "cosine"
//       },
//       {
//         "type": "filter",
//         "path": "userId"
//       }
//     ]
//   }
// }

// Update access tracking
userContextSchema.methods.recordAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

// Instance method for semantic search
userContextSchema.statics.semanticSearch = async function(
  userId: mongoose.Types.ObjectId,
  queryEmbedding: number[],
  limit: number = 10,
  minScore: number = 0.7
) {
  return this.aggregate([
    {
      $match: { userId }
    },
    {
      $search: {
        cosmosSearch: {
          vector: queryEmbedding,
          path: 'embedding',
          k: limit,
          filter: { userId }
        }
      }
    },
    {
      $project: {
        key: 1,
        value: 1,
        tags: 1,
        metadata: 1,
        source: 1,
        score: { $meta: 'searchScore' }
      }
    },
    {
      $match: {
        score: { $gte: minScore }
      }
    }
  ]);
};

const UserContext = mongoose.model<IUserContext>('UserContext', userContextSchema);

export default UserContext; 