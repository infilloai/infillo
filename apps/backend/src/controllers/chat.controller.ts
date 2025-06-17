import { Request, Response } from 'express';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import chatService from '../services/chat.service';
import logger from '../utils/logger';

/**
 * Send a chat message
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { message, formId } = req.body;
    let { sessionId } = req.body;

    // Start a new session if none provided
    if (!sessionId) {
      sessionId = await chatService.startChatSession(userId, formId);
    }

    const response = await chatService.sendMessage(
      userId,
      sessionId,
      message,
      formId
    );

    res.json({
      success: true,
      data: {
        sessionId,
        ...response
      }
    });
  } catch (error) {
    logger.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

/**
 * Stream chat response using Server-Sent Events
 */
export const streamMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { message, formId } = req.body;
    let { sessionId } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection event
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);

    // Start a new session if none provided
    if (!sessionId) {
      sessionId = await chatService.startChatSession(userId, formId);
      res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);
    }

    // Stream the response
    const stream = chatService.streamMessage(userId, sessionId, message, formId);
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // Send completion event
    res.write('event: complete\n');
    res.write('data: {"done": true}\n\n');
    res.end();
  } catch (error) {
    logger.error('Error streaming chat message:', error);
    res.write('event: error\n');
    res.write(`data: ${JSON.stringify({ error: 'Failed to stream message' })}\n\n`);
    res.end();
  }
};

/**
 * Get chat history
 */
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    } else {
      const messages = await chatService.getChatHistory(userId, sessionId);

      res.json({
        success: true,
        data: messages
      });
    }
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history'
    });
  }
};

/**
 * Get recent chat sessions
 */
export const getRecentSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { limit = 10 } = req.query;

    const sessions = await chatService.getRecentSessions(userId, Number(limit));

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Error getting recent sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent sessions'
    });
  }
};

/**
 * End chat session
 */
export const endSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    } else {
      await chatService.endChatSession(userId, sessionId);

      res.json({
        success: true,
        message: 'Chat session ended successfully'
      });
    }
  } catch (error) {
    logger.error('Error ending chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end chat session'
    });
  }
};

/**
 * Get form assistance
 */
export const getFormAssistance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as IUser)._id as mongoose.Types.ObjectId;
    const { formFields, currentValues } = req.body;

    const assistance = await chatService.getFormAssistance(
      userId,
      formFields,
      currentValues
    );

    res.json({
      success: true,
      data: {
        assistance
      }
    });
  } catch (error) {
    logger.error('Error getting form assistance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form assistance'
    });
  }
}; 