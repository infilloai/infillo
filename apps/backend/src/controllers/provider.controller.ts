import { Request, Response } from 'express';
import { IUser } from '../models/User';
import providerService from '../services/provider.service';
import logger from '../utils/logger';

/**
 * Get current provider configuration
 */
export const getCurrentProviders = async (_req: Request, res: Response) => {
  try {
    const providers = providerService.getCurrentProviders();
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    logger.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider configuration'
    });
  }
};

/**
 * Switch storage provider
 */
export const switchStorageProvider = async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      res.status(400).json({
        success: false,
        message: 'Provider type is required'
      });
      return;
    }

    // Only allow admins to switch providers
    if ((req.user as IUser)?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can switch providers'
      });
      return;
    }

    await providerService.switchStorageProvider(provider);
    
    res.json({
      success: true,
      message: `Successfully switched to ${provider} storage provider`
    });
  } catch (error) {
    logger.error('Error switching storage provider:', error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to switch storage provider'
    });
  }
};

/**
 * Switch AI provider
 */
export const switchAIProvider = async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      res.status(400).json({
        success: false,
        message: 'Provider type is required'
      });
      return;
    }

    // Only allow admins to switch providers
    if ((req.user as IUser)?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can switch providers'
      });
      return;
    }

    providerService.switchAIProvider(provider);
    
    res.json({
      success: true,
      message: `Successfully switched to ${provider} AI provider`
    });
  } catch (error) {
    logger.error('Error switching AI provider:', error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to switch AI provider'
    });
  }
};

/**
 * Get available providers
 */
export const getAvailableProviders = async (_req: Request, res: Response) => {
  try {
    const availableProviders = {
      storage: {
        implemented: ['google'],
        upcoming: ['aws', 'azure', 'local']
      },
      ai: {
        implemented: ['google'],
        upcoming: ['openai', 'anthropic', 'azure']
      }
    };
    
    res.json({
      success: true,
      data: availableProviders
    });
  } catch (error) {
    logger.error('Error getting available providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available providers'
    });
  }
}; 