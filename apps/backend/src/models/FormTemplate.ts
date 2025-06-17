import mongoose, { Document, Schema } from 'mongoose';
import { FormField } from '../types';

export interface IFormTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  templateName: string;
  fields: FormField[];
  domain?: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'text',
  },
  value: String,
  context: String,
  required: Boolean,
  placeholder: String,
}, { _id: false });

const formTemplateSchema = new Schema<IFormTemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    fields: {
      type: [formFieldSchema],
      required: true,
      validate: {
        validator: function(v: FormField[]) {
          return v.length > 0;
        },
        message: 'Template must have at least one field'
      }
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
formTemplateSchema.index({ userId: 1, templateName: 1 });
formTemplateSchema.index({ userId: 1, domain: 1 });
formTemplateSchema.index({ userId: 1, tags: 1 });
formTemplateSchema.index({ isPublic: 1, usageCount: -1 });
formTemplateSchema.index({ userId: 1, lastUsed: -1 });

// Instance methods
formTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static methods
formTemplateSchema.statics.findByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId }).sort({ lastUsed: -1, createdAt: -1 });
};

formTemplateSchema.statics.findPublic = function(limit: number = 10) {
  return this.find({ isPublic: true })
    .sort({ usageCount: -1 })
    .limit(limit);
};

formTemplateSchema.statics.findByDomain = function(
  userId: mongoose.Types.ObjectId, 
  domain: string
) {
  return this.find({
    $or: [
      { userId, domain },
      { isPublic: true, domain }
    ]
  }).sort({ usageCount: -1 });
};

// Virtual for field count
formTemplateSchema.virtual('fieldCount').get(function() {
  return this.fields.length;
});

const FormTemplate = mongoose.model<IFormTemplate>('FormTemplate', formTemplateSchema);

export default FormTemplate; 