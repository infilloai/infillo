import mongoose, { Document, Schema } from 'mongoose';
import { FormField, FormFeedback } from '../types';

export interface IFormHistory extends Document {
  userId: mongoose.Types.ObjectId;
  formId: string;
  templateId?: mongoose.Types.ObjectId;
  fields: FormField[];
  filledValues: Record<string, string>;
  domain: string;
  url: string;
  feedback: FormFeedback[];
  accuracy: number; // Calculated based on feedback
  submittedAt: Date;
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

const formFeedbackSchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  previousValue: {
    type: String,
    required: true,
  },
  correctValue: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const formHistorySchema = new Schema<IFormHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    formId: {
      type: String,
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'FormTemplate',
    },
    fields: {
      type: [formFieldSchema],
      required: true,
    },
    filledValues: {
      type: Map,
      of: String,
      required: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    url: {
      type: String,
      required: true,
    },
    feedback: {
      type: [formFeedbackSchema],
      default: [],
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
formHistorySchema.index({ userId: 1, submittedAt: -1 });
formHistorySchema.index({ userId: 1, domain: 1 });
formHistorySchema.index({ userId: 1, accuracy: -1 });
formHistorySchema.index({ userId: 1, templateId: 1 });

// Calculate accuracy based on feedback
formHistorySchema.methods.calculateAccuracy = function() {
  if (this.fields.length === 0) return 100;
  
  const totalFields = this.fields.length;
  const correctedFields = this.feedback.length;
  
  this.accuracy = Math.round(((totalFields - correctedFields) / totalFields) * 100);
  return this.accuracy;
};

// Add feedback
formHistorySchema.methods.addFeedback = function(feedback: FormFeedback) {
  // Check if feedback for this field already exists
  const existingIndex = this.feedback.findIndex((f: FormFeedback) => f.field === feedback.field);
  
  if (existingIndex >= 0) {
    this.feedback[existingIndex] = feedback;
  } else {
    this.feedback.push(feedback);
  }
  
  this.calculateAccuracy();
  return this.save();
};

// Static methods
formHistorySchema.statics.findByUserId = function(
  userId: mongoose.Types.ObjectId,
  limit: number = 50
) {
  return this.find({ userId })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate('templateId', 'templateName');
};

formHistorySchema.statics.findByDomain = function(
  userId: mongoose.Types.ObjectId,
  domain: string
) {
  return this.find({ userId, domain })
    .sort({ submittedAt: -1 });
};

formHistorySchema.statics.getAccuracyStats = async function(
  userId: mongoose.Types.ObjectId
) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        avgAccuracy: { $avg: '$accuracy' },
        totalForms: { $sum: 1 },
        totalFeedback: { $sum: { $size: '$feedback' } },
      }
    }
  ]);
  
  return stats[0] || { avgAccuracy: 100, totalForms: 0, totalFeedback: 0 };
};

// Virtual for feedback count
formHistorySchema.virtual('feedbackCount').get(function() {
  return this.feedback.length;
});

const FormHistory = mongoose.model<IFormHistory>('FormHistory', formHistorySchema);

export default FormHistory; 