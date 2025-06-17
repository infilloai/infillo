import { Router } from 'express';
import { 
  sendMessage,
  streamMessage,
  getChatHistory,
  getRecentSessions,
  endSession,
  getFormAssistance
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { validate, chatMessageSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Send message
router.post(
  '/message',
  validate(chatMessageSchema),
  sendMessage
);

// Stream message (SSE)
router.post(
  '/message/stream',
  validate(chatMessageSchema),
  streamMessage
);

// Get chat history
router.get(
  '/session/:sessionId/history',
  getChatHistory
);

// Get recent sessions
router.get(
  '/sessions',
  getRecentSessions
);

// End session
router.post(
  '/session/:sessionId/end',
  endSession
);

// Get form assistance
router.post(
  '/form-assistance',
  getFormAssistance
);

export default router; 