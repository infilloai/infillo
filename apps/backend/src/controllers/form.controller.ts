import { Request, Response } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import formService from '../services/form.service';
import FormHistory from '../models/FormHistory';
import Form from '../models/Form';
import Document from '../models/Document';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Detect form fields from HTML, save form, and return suggestions
 */
export const detectFormFields = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { html, url, domain } = req.body;
    
    // Generate unique form ID
    const formId = uuidv4();
    
    // Detect form fields from HTML
    const fields = await formService.detectFormFields(html);
    
    // Get all suggestions at once from the form service
    const allSuggestions = await formService.generateAutofillSuggestions(
      userId,
      { fields, formContext: `URL: ${url || ''} Domain: ${domain || ''}` }
    );
    logger.info(`[detectFormFields] Raw suggestions from service: ${JSON.stringify(allSuggestions, null, 2)}`);

    const suggestions: Record<string, any[]> = {};
    
    // Convert FieldSuggestion arrays to our format
    for (const field of fields) {
      const fieldSuggestions = allSuggestions[field.name] || [];
      logger.info(`[detectFormFields] Processing field "${field.name}" with ${fieldSuggestions.length} suggestions.`);
      
      const filteredSuggestions = fieldSuggestions
        .filter(suggestion => {
          const isValid = suggestion.suggestedValue && suggestion.suggestedValue.trim().length > 0;
          if (!isValid) {
            logger.warn(`[detectFormFields] Filtering out invalid suggestion for field "${field.name}": ${JSON.stringify(suggestion)}`);
          }
          return isValid;
        });

      suggestions[field.name] = filteredSuggestions
        .map(suggestion => ({
          value: suggestion.suggestedValue,
          source: suggestion.source || 'AI Suggestion',
          confidence: Math.round(suggestion.confidence || 0), // Already in 0-100 range, just round
          explanation: suggestion.reasoning || 'Generated based on your profile data'
        }));

      logger.info(`[detectFormFields] Field "${field.name}" has ${suggestions[field.name]?.length || 0} valid suggestions after filtering.`);
    }
    
    // Create and save the form
    const form = await Form.create({
      userId,
      formId,
      htmlContent: html,
      url: url || '',
      domain: domain || new URL(url || 'http://localhost').hostname,
      fields,
      suggestions: new Map(Object.entries(suggestions))
    });
    
    res.json({
      success: true,
      data: {
        formId: form.formId,
        fields,
        suggestions
      }
    });
  } catch (error) {
    logger.error('Error detecting form fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect form fields'
    });
  }
};

/**
 * Save form submission
 */
export const saveFormSubmission = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { formId, fields, filledValues, domain, url } = req.body;
    
    const formHistory = await formService.saveFormSubmission(userId, {
      formId,
      fields,
      filledValues,
      domain,
      url
    });
    
    res.json({
      success: true,
      data: formHistory,
      message: 'Form submission saved successfully'
    });
  } catch (error) {
    logger.error('Error saving form submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save form submission'
    });
  }
};

/**
 * Refine field value based on formId with additional context
 */
export const refineField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formId, fieldName, contextText, customPrompt, documentIds } = req.body;

    if (!formId || !fieldName) {
      res.status(400).json({
        success: false,
        message: 'Missing formId or fieldName'
      });
      return;
    }

    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    
    // Get the stored form
    const form = await Form.findOne({ userId, formId });
    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form not found'
      });
      return;
    }
    
    // Find the specific field in the form
    const field = form.fields.find(f => f.name === fieldName);
    if (!field) {
      res.status(404).json({
        success: false,
        message: 'Field not found in form'
      });
      return;
    }
    
    // Fetch document context if documentIds provided
    let documentContext = '';
    if (documentIds && documentIds.length > 0) {
      try {
        const documents = await Document.find({
          _id: { $in: documentIds },
          userId,
          processingStatus: 'completed'
        }).select('fileName originalContent extractedEntities');
        
        if (documents.length > 0) {
          documentContext = documents.map(doc => {
            const entities = doc.extractedEntities.map(e => `${e.type}: ${e.value}`).join(', ');
            return `Document: ${doc.fileName}\nContent: ${doc.originalContent.substring(0, 2000)}...\nEntities: ${entities}`;
          }).join('\n\n');
        }
      } catch (error) {
        logger.warn('Failed to fetch document context:', error);
      }
    }
    
    // Combine all context
    const combinedContext = [contextText, customPrompt, documentContext]
      .filter(Boolean)
      .join('\n\n');
    
    // Generate refined suggestions using the form context
    const refinedSuggestions = await formService.generateAutofillSuggestions(
      userId,
      {
        fields: [{ ...field, context: combinedContext }],
        formContext: `URL: ${form.url} Domain: ${form.domain}`
      }
    );
    
    // Get current suggestions from form
    const currentSuggestions = Array.isArray(form.suggestions) 
      ? [] 
      : (form.suggestions instanceof Map ? form.suggestions.get(fieldName) : form.suggestions?.[fieldName]) || [];
    
    // Process the refined suggestions with proper confidence and explanations
    const refinedFieldSuggestions = refinedSuggestions[field.name] || [];
    const newSuggestions = refinedFieldSuggestions
      .filter(suggestion => suggestion.suggestedValue && suggestion.suggestedValue.trim().length > 0)
      .map(suggestion => ({
        value: suggestion.suggestedValue,
        source: `${suggestion.source || 'AI Suggestion'} (Enhanced)`,
        confidence: Math.round(suggestion.confidence || 0), // Already in 0-100 range, just round
        explanation: suggestion.reasoning || 'Refined based on your additional context'
      }));
    
    // Combine new suggestions with existing ones (keep top 3 existing)
    const updatedSuggestions = [
      ...newSuggestions,
      ...currentSuggestions.slice(0, 3)
    ];
    
    // Update form suggestions
    if (form.suggestions instanceof Map) {
      form.suggestions.set(fieldName, updatedSuggestions);
    } else {
      form.suggestions = form.suggestions || {};
      form.suggestions[fieldName] = updatedSuggestions;
    }
    
    await form.save();
    
    res.json({
      success: true,
      data: {
        formId,
        fieldName,
        refinedSuggestions: newSuggestions,
        allSuggestions: updatedSuggestions,
        documentsUsed: documentIds?.length || 0
      }
    });
  } catch (error) {
    logger.error('Error refining field value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refine value'
    });
  }
};

/**
 * Get form history (analyzed/detected forms)
 */
export const getFormHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [forms, total] = await Promise.all([
      Form.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Form.countDocuments({ userId })
    ]);
    
    res.json({
      success: true,
      data: forms,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting form history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form history'
    });
  }
};

/**
 * Get single form submission
 */
export const getFormSubmission = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { formId } = req.params;
    
    const form = await FormHistory.findOne({ userId, formId });
    
    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form submission not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    logger.error('Error getting form submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form submission'
    });
  }
};

/**
 * Get form analysis stats
 */
export const getFormStats = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    
    // Calculate stats from analyzed forms using aggregation
    const [stats] = await Form.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalForms: { $sum: 1 },
          totalFields: { $sum: { $size: '$fields' } },
          totalSuggestions: { 
            $sum: { 
              $size: { 
                $objectToArray: '$suggestions' 
              } 
            } 
          }
        }
      }
    ]);
    
    const result = {
      totalForms: stats?.totalForms || 0,
      totalFields: stats?.totalFields || 0,
      totalSuggestions: stats?.totalSuggestions || 0,
      avgFieldsPerForm: stats?.totalForms > 0 ? Math.round((stats?.totalFields || 0) / stats.totalForms) : 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting form stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form stats'
    });
  }
};

 