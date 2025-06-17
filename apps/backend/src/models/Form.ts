import mongoose, { Document, Schema } from 'mongoose';
import { FormField } from '../types';

export interface IForm extends Document {
  userId: mongoose.Types.ObjectId;
  formId: string;
  htmlContent: string;
  url: string;
  domain: string;
  fields: FormField[];
  suggestions: Record<string, {
    value: string;
    source: string;
    confidence: number;
  }[]>;
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
  selector: String,
}, { _id: false });

const suggestionSchema = new Schema({
  value: {
    type: String,
    required: false,
  },
  source: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
}, { _id: false });

const formSchema = new Schema<IForm>(
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
    htmlContent: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fields: {
      type: [formFieldSchema],
      required: true,
    },
    suggestions: {
      type: Map,
      of: [suggestionSchema],
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
formSchema.index({ userId: 1, createdAt: -1 });
formSchema.index({ userId: 1, domain: 1 });
formSchema.index({ formId: 1 });

const Form = mongoose.model<IForm>('Form', formSchema);

export default Form; 