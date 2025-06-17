import { Request, Response } from 'express';
import BlockedOrigin from '../models/BlockedOrigin';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Block an origin for the authenticated user
 */
export const blockOrigin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin } = req.body;
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    if (!origin) {
      res.status(400).json({
        success: false,
        message: 'Origin is required'
      });
      return;
    }

    // Extract domain from origin
    const domain = (BlockedOrigin as any).extractDomain(origin);

    // Create blocked origin record
    const blockedOrigin = new BlockedOrigin({
      userId,
      origin,
      domain,
    });

    await blockedOrigin.save();

    res.status(201).json({
      success: true,
      message: 'Origin blocked successfully',
      data: {
        id: blockedOrigin._id,
        origin: blockedOrigin.origin,
        domain: blockedOrigin.domain,
        createdAt: blockedOrigin.createdAt,
      },
    });
  } catch (error: any) {
    // Handle duplicate key error (same origin blocked twice)
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Origin is already blocked',
      });
      return;
    }

    logger.error('Error blocking origin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block origin',
    });
  }
};

/**
 * Unblock an origin for the authenticated user
 */
export const unblockOrigin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin } = req.body;
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    if (!origin) {
      res.status(400).json({
        success: false,
        message: 'Origin is required'
      });
      return;
    }

    const result = await BlockedOrigin.findOneAndDelete({
      userId,
      origin,
    });

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Blocked origin not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Origin unblocked successfully',
    });
  } catch (error: any) {
    logger.error('Error unblocking origin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock origin',
    });
  }
};

/**
 * Check if an origin is blocked for the authenticated user
 */
export const checkOriginBlocked = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin } = req.query;
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    logger.info('🔍 checkOriginBlocked called:', {
      origin,
      userId: userId.toString(),
      userEmail: (req.user as IUser).email,
      query: req.query
    });

    if (!origin || typeof origin !== 'string') {
      logger.warn('❌ checkOriginBlocked: Invalid origin provided:', { origin, type: typeof origin });
      res.status(400).json({
        success: false,
        message: 'Origin is required'
      });
      return;
    }

    logger.info('🔍 checkOriginBlocked: Searching for blocked origin...');
    const blockedOrigin = await BlockedOrigin.findOne({
      userId,
      origin,
    });

    logger.info('🔍 checkOriginBlocked: Search result:', {
      found: !!blockedOrigin,
      blockData: blockedOrigin ? {
        id: blockedOrigin._id,
        origin: blockedOrigin.origin,
        domain: blockedOrigin.domain,
        createdAt: blockedOrigin.createdAt
      } : null
    });

    const isBlocked = !!blockedOrigin;
    logger.info('✅ checkOriginBlocked: Returning result:', { isBlocked, origin });

    res.json({
      success: true,
      data: {
        isBlocked,
        origin,
      },
    });
  } catch (error: any) {
    logger.error('❌ checkOriginBlocked: Error occurred:', {
      error: error.message,
      stack: error.stack,
      origin: req.query?.origin,
      userId: (req.user as IUser)?._id?.toString()
    });
    res.status(500).json({
      success: false,
      message: 'Failed to check origin status',
    });
  }
};

/**
 * Get all blocked origins for the authenticated user
 */
export const getBlockedOrigins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blockedOrigins = await BlockedOrigin.find({ userId })
      .select('origin domain createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BlockedOrigin.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        blockedOrigins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Error getting blocked origins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blocked origins',
    });
  }
};

/**
 * Toggle block status for an origin
 */
export const toggleOriginBlock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin } = req.body;
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    logger.info('🔄 toggleOriginBlock called:', {
      origin,
      userId: userId.toString(),
      userEmail: (req.user as IUser).email,
      body: req.body
    });

    if (!origin) {
      logger.warn('❌ toggleOriginBlock: No origin provided');
      res.status(400).json({
        success: false,
        message: 'Origin is required'
      });
      return;
    }

    // Check if origin is already blocked
    logger.info('🔍 toggleOriginBlock: Checking for existing block...');
    const existingBlock = await BlockedOrigin.findOne({
      userId,
      origin,
    });

    logger.info('🔍 toggleOriginBlock: Existing block result:', {
      found: !!existingBlock,
      blockId: existingBlock?._id?.toString(),
      blockData: existingBlock ? {
        id: existingBlock._id,
        origin: existingBlock.origin,
        domain: existingBlock.domain,
        createdAt: existingBlock.createdAt
      } : null
    });

    if (existingBlock) {
      // Unblock it
      logger.info('🚫 toggleOriginBlock: Unblocking origin...');
      const deleteResult = await BlockedOrigin.findOneAndDelete({
        userId,
        origin,
      });

      logger.info('🚫 toggleOriginBlock: Delete result:', {
        deleted: !!deleteResult,
        deletedData: deleteResult ? {
          id: deleteResult._id,
          origin: deleteResult.origin,
          domain: deleteResult.domain
        } : null
      });

      logger.info('✅ toggleOriginBlock: Origin unblocked successfully');
      res.json({
        success: true,
        message: 'Origin unblocked successfully',
        data: {
          isBlocked: false,
          origin,
        },
      });
    } else {
      // Block it
      logger.info('🔒 toggleOriginBlock: Blocking origin...');
      const domain = (BlockedOrigin as any).extractDomain(origin);
      
      logger.info('🔒 toggleOriginBlock: Extracted domain:', { origin, domain });
      
      const blockedOrigin = new BlockedOrigin({
        userId,
        origin,
        domain,
      });

      logger.info('🔒 toggleOriginBlock: Saving new blocked origin...');
      await blockedOrigin.save();

      logger.info('✅ toggleOriginBlock: Origin blocked successfully:', {
        id: blockedOrigin._id,
        origin: blockedOrigin.origin,
        domain: blockedOrigin.domain,
        createdAt: blockedOrigin.createdAt
      });

      res.json({
        success: true,
        message: 'Origin blocked successfully',
        data: {
          isBlocked: true,
          origin,
          id: blockedOrigin._id,
          createdAt: blockedOrigin.createdAt,
        },
      });
    }
  } catch (error: any) {
    logger.error('❌ toggleOriginBlock: Error occurred:', {
      error: error.message,
      stack: error.stack,
      origin: req.body?.origin,
      userId: (req.user as IUser)?._id?.toString()
    });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle origin block status',
    });
  }
}; 