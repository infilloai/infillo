import { Request, Response } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import UserContext from '../models/UserContext';
import Document from '../models/Document';
import Form from '../models/Form';
import BlockedOrigin from '../models/BlockedOrigin';
import logger from '../utils/logger';

/**
 * Get dashboard statistics for the authenticated user
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;

    // Get counts for all user data types in parallel
    const [
      personalRecordsCount,
      documentsCount,
      formsCount,
      blockedOriginsCount,
      // Additional stats
      manualRecordsCount,
      documentRecordsCount,
      formRecordsCount,
      recentFormsCount,
      mostUsedRecordsCount
    ] = await Promise.all([
      // Basic counts
      UserContext.countDocuments({ userId }),
      Document.countDocuments({ userId }),
      Form.countDocuments({ userId }),
      BlockedOrigin.countDocuments({ userId }),
      
      // Detailed context stats
      UserContext.countDocuments({ userId, source: 'manual' }),
      UserContext.countDocuments({ userId, source: 'document' }),
      UserContext.countDocuments({ userId, source: 'form' }),
      
      // Recent activity (last 30 days)
      Form.countDocuments({ 
        userId, 
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      
      // Most accessed records
      UserContext.countDocuments({ userId, accessCount: { $gt: 0 } })
    ]);

    const stats = {
      overview: {
        personalRecords: personalRecordsCount,
        documents: documentsCount,
        forms: formsCount,
        blockedOrigins: blockedOriginsCount
      },
      personalRecords: {
        total: personalRecordsCount,
        manual: manualRecordsCount,
        fromDocuments: documentRecordsCount,
        fromForms: formRecordsCount,
        mostUsed: mostUsedRecordsCount
      },
      activity: {
        recentForms: recentFormsCount,
        totalFormSubmissions: formsCount
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
};

/**
 * Get detailed statistics for a specific data type
 */
export const getDetailedStats = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { type } = req.params;

    let stats;

    switch (type) {
      case 'personal-records':
        const [totalRecords, sourceBreakdown, tagStats, recentActivity] = await Promise.all([
          UserContext.countDocuments({ userId }),
          UserContext.aggregate([
            { $match: { userId } },
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ]),
          UserContext.aggregate([
            { $match: { userId } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]),
          UserContext.countDocuments({ 
            userId, 
            lastAccessed: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          })
        ]);

        stats = {
          total: totalRecords,
          sources: sourceBreakdown.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          topTags: tagStats,
          recentlyUsed: recentActivity
        };
        break;

      case 'forms':
        const [totalForms, recentForms, formDomains] = await Promise.all([
          Form.countDocuments({ userId }),
          Form.countDocuments({ 
            userId, 
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }),
          Form.aggregate([
            { $match: { userId } },
            { $group: { _id: '$domain', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ])
        ]);

        stats = {
          total: totalForms,
          recent: recentForms,
          topDomains: formDomains
        };
        break;

      default:
        res.status(400).json({
          success: false,
          message: 'Invalid stats type requested'
        });
        return;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Error getting ${req.params.type} stats:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get ${req.params.type} statistics`
    });
  }
}; 