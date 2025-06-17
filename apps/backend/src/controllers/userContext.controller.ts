import { Request, Response } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import UserContext from '../models/UserContext';
import aiService from '../services/ai.service';
import logger from '../utils/logger';

/**
 * Create or update user context
 */
export const createContext = async (req: Request, res: Response) => {
  try {
    const { key, value, tags = [] } = req.body;
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    // Generate embedding for the value
    const embedding = await aiService.generateEmbedding(value);

    // Check if context with this key already exists
    const existingContext = await UserContext.findOne({ userId, key });

    if (existingContext) {
      // Update existing context
      existingContext.value = value;
      existingContext.tags = tags;
      existingContext.embedding = embedding;
      existingContext.lastAccessed = new Date();
      await existingContext.save();

      res.json({
        success: true,
        data: existingContext,
        message: 'Context updated successfully'
      });
      return;
    }

    // Create new context
    const context = await UserContext.create({
      userId,
      key,
      value,
      tags,
      embedding,
      source: 'manual'
    });

    res.status(201).json({
      success: true,
      data: context,
      message: 'Context created successfully'
    });
  } catch (error) {
    logger.error('Error creating context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create context'
    });
  }
};

/**
 * Get all user contexts
 */
export const getContexts = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { source, tags, page = 1, limit = 20 } = req.query;

    const query: any = { userId };
    
    if (source) {
      query.source = source;
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [contexts, total] = await Promise.all([
      UserContext.find(query)
        .sort({ lastAccessed: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-embedding'), // Exclude embedding from list view
      UserContext.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: contexts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error getting contexts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contexts'
    });
  }
};

/**
 * Get single context by ID
 */
export const getContext = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { id } = req.params;

    const context = await UserContext.findOne({ _id: id, userId });
    
    if (!context) {
      res.status(404).json({
        success: false,
        message: 'Context not found'
      });
      return;
    }

    // Update access tracking
    context.lastAccessed = new Date();
    context.accessCount = (context.accessCount || 0) + 1;
    await context.save();

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    logger.error('Error getting context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get context'
    });
  }
};

/**
 * Update context
 */
export const updateContext = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { id } = req.params;
    const { key, value, tags, metadata } = req.body;

    const context = await UserContext.findOne({ _id: id, userId });
    
    if (!context) {
      res.status(404).json({
        success: false,
        message: 'Context not found'
      });
      return;
    }

    const updateData: any = {};

    // Update key if provided
    if (key !== undefined && key !== context.key) {
      updateData.key = key;
    }

    // Generate new embedding if value changed
    if (value !== undefined && value !== context.value) {
      const embedding = await aiService.generateEmbedding(value);
      updateData.embedding = embedding;
      updateData.value = value;
    }

    // Update tags if provided
    if (tags !== undefined) {
      updateData.tags = tags;
    }

    // Update metadata if provided
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    updateData.lastAccessed = new Date();

    const updatedContext = await UserContext.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      success: true,
      data: updatedContext,
      message: 'Context updated successfully'
    });
  } catch (error) {
    logger.error('Error updating context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update context'
    });
  }
};

/**
 * Delete context
 */
export const deleteContext = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { id } = req.params;

    const result = await UserContext.deleteOne({ _id: id, userId });
    
    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Context not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Context deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete context'
    });
  }
};

/**
 * Search contexts by similarity
 */
export const searchContexts = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { query, limit = 10 } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
      return;
    }

    // Generate embedding for search query (for future use)
    await aiService.generateEmbedding(query);

    // Perform basic search using text matching for now
    const results = await UserContext.find({
      userId,
      $text: { $search: query }
    })
    .limit(Number(limit))
    .sort({ score: { $meta: 'textScore' } });

    res.json({
      success: true,
      data: results,
      query
    });
  } catch (error) {
    logger.error('Error searching contexts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search contexts'
    });
  }
}; 