import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import aiService from './ai.service';
import ChatHistory from '../models/ChatHistory';
import FormHistory from '../models/FormHistory';
import UserContext from '../models/UserContext';
import logger from '../utils/logger';
import { ChatMessage, FormField } from '../types';

class ChatService {
  /**
   * Start a new chat session
   */
  async startChatSession(
    userId: mongoose.Types.ObjectId,
    formId?: string
  ): Promise<string> {
    try {
      // Check for existing active session
      const activeSession = await ChatHistory.findOne({ userId, status: 'active' });
      if (activeSession) {
        return activeSession.sessionId;
      }

      // Create new session
      const sessionId = uuidv4();
      await ChatHistory.create({
        userId,
        sessionId,
        formId,
        status: 'active',
        messages: [],
        context: {}
      });

      logger.info(`Started new chat session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      logger.error('Error starting chat session:', error);
      throw new Error('Failed to start chat session');
    }
  }

  /**
   * Send a message in the chat
   */
  async sendMessage(
    userId: mongoose.Types.ObjectId,
    sessionId: string,
    message: string,
    formId?: string
  ): Promise<{ reply: string; suggestedFields?: Record<string, string> }> {
    try {
      // Find or create chat session
      let chatHistory = await ChatHistory.findOne({ sessionId, userId });
      if (!chatHistory) {
        chatHistory = await ChatHistory.create({
          userId,
          sessionId,
          formId,
          status: 'active',
          messages: [],
          context: {}
        });
      }

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        formId
      };
      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        $push: { messages: userMessage }
      });

      // Detect form context from the message if no formId provided
      let detectedFormContext = null;
      if (!formId) {
        detectedFormContext = await this.detectFormContext(message);
      }

      // Get form context if available
      interface FormContextType {
        formFields?: any[];
        filledValues?: Record<string, string>;
      }
      let formContext: FormContextType = {};
      if (formId) {
        const formHistory = await FormHistory.findOne({ userId, formId });
        if (formHistory) {
          formContext = {
            formFields: formHistory.fields,
            filledValues: formHistory.filledValues
          };
          await ChatHistory.findByIdAndUpdate(chatHistory._id, {
            context: formContext
          });
        }
      }

      // Get user context to help with form assistance
      const userContexts = await UserContext.find({ userId })
        .sort({ lastAccessed: -1, accessCount: -1 })
        .limit(20);

      // Get conversation history for context
      const conversationHistory = chatHistory.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Create enhanced context for AI
      const enhancedContext = {
        userContexts: userContexts.map(ctx => ({
          key: ctx.key,
          value: ctx.value,
          tags: ctx.tags,
          source: ctx.source
        })),
        formContext,
        conversationHistory,
        hasUserData: userContexts.length > 0,
        detectedFormType: detectedFormContext?.formType,
        formDetectionConfidence: detectedFormContext?.confidence || 0,
        formSuggestions: detectedFormContext?.suggestions || []
      };

      // Generate AI response with enhanced system prompt
      const systemPrompt = this.generateEnhancedSystemPrompt(enhancedContext);

      const aiResponse = await aiService.generateChatResponse(
        message,
        JSON.stringify(enhancedContext),
        systemPrompt
      );

      // Check if AI suggested any field values
      const suggestedFields = this.extractSuggestedFields(aiResponse);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        formId,
        metadata: suggestedFields ? { suggestedFields } : undefined
      };
      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        $push: { messages: assistantMessage }
      });

      return {
        reply: aiResponse,
        suggestedFields
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Generate enhanced system prompt for better form assistance
   */
  private generateEnhancedSystemPrompt(context: any): string {
    const { userContexts, formContext, hasUserData, detectedFormType, formDetectionConfidence, formSuggestions } = context;
    
    let systemPrompt = `You are InfilloAI, an intelligent form-filling assistant. Your role is to help users efficiently complete forms by:

1. **Form Detection & Analysis**: When users mention forms, automatically identify:
   - Form type (job application, registration, survey, contact form, etc.)
   - Required fields and their purpose
   - Best practices for that form type

2. **Smart Suggestions**: Provide specific, actionable advice based on:
   - Form type and context
   - User's available information
   - Industry standards and best practices

3. **Data Utilization**: ${hasUserData ? 
      `You have access to the user's context data including personal info, documents, and previous form entries. Use this to provide personalized suggestions.` : 
      `The user hasn't provided much context data yet. Encourage them to share relevant information or upload documents like resumes to get better assistance.`}

**Key Behaviors:**
- Be proactive in identifying form types from user descriptions
- Offer specific field suggestions rather than generic advice
- Ask clarifying questions to better understand the form context
- Provide examples when helpful
- Be concise but comprehensive

`;

    // Add detected form information if available
    if (detectedFormType && formDetectionConfidence > 0.3) {
      systemPrompt += `\n**Detected Form Type:** ${detectedFormType} (confidence: ${Math.round(formDetectionConfidence * 100)}%)

**Form-Specific Guidance:**
${formSuggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}

Since I detected this is likely a ${detectedFormType}, I should provide specific advice for this type of form.
`;
    }

    // Add form-specific context if available
    if (formContext?.formFields && formContext.formFields.length > 0) {
      systemPrompt += `\n**Current Form Context:**
- Fields: ${formContext.formFields.map((f: any) => `${f.label || f.name} (${f.type})`).join(', ')}
- Already filled: ${formContext.filledValues ? Object.keys(formContext.filledValues).length : 0} fields
`;
    }

    // Add user context summary if available
    if (hasUserData && userContexts.length > 0) {
      const contextSummary = userContexts.slice(0, 10).map((ctx: any) => 
        `${ctx.key}: ${ctx.value.substring(0, 100)}${ctx.value.length > 100 ? '...' : ''}`
      ).join('\n- ');
      
      systemPrompt += `\n**Available User Information:**
- ${contextSummary}

Use this information to provide personalized suggestions for form fields.`;
    }

    systemPrompt += `\n\n**Response Style:**
- ${detectedFormType ? `Start by confirming this is a ${detectedFormType} and provide specific guidance` : 'Start with form identification if not clear'}
- Provide specific, actionable suggestions
- Be encouraging and professional
- Ask follow-up questions when needed`;

    return systemPrompt;
  }

  /**
   * Stream a chat response (for real-time responses)
   */
  async *streamMessage(
    userId: mongoose.Types.ObjectId,
    sessionId: string,
    message: string,
    formId?: string
  ): AsyncGenerator<{ chunk: string; done: boolean }> {
    try {
      // Add user message to history
      const chatHistory = await ChatHistory.findOne({ sessionId, userId });
      if (!chatHistory) {
        throw new Error('Chat session not found');
      }

      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        formId
      };
      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        $push: { messages: userMessage }
      });

      // Get form context
      interface FormContextType {
        formFields?: any[];
        filledValues?: Record<string, string>;
      }
      let formContext: FormContextType = {};
      if (formId) {
        const formHistory = await FormHistory.findOne({ userId, formId });
        if (formHistory) {
          formContext = {
            formFields: formHistory.fields,
            filledValues: formHistory.filledValues
          };
        }
      }

      // Get user context for enhanced assistance
      const userContexts = await UserContext.find({ userId })
        .sort({ lastAccessed: -1, accessCount: -1 })
        .limit(20);

      const enhancedContext = {
        userContexts: userContexts.map(ctx => ({
          key: ctx.key,
          value: ctx.value,
          tags: ctx.tags,
          source: ctx.source
        })),
        formContext,
        conversationHistory: chatHistory.messages.slice(-10),
        hasUserData: userContexts.length > 0
      };

      // Stream AI response
      const responseChunks: string[] = [];
      const systemPrompt = this.generateEnhancedSystemPrompt(enhancedContext);

      let isStreaming = true;
      await aiService.streamChatResponse(
        message,
        JSON.stringify(enhancedContext),
        async (chunk) => {
          responseChunks.push(chunk);
          // Yield chunk immediately as it comes
          if (isStreaming) {
            // We'll handle yielding outside this callback
          }
        },
        systemPrompt
      );

      // Yield chunks as they were collected
      for (let i = 0; i < responseChunks.length; i++) {
        const chunk = responseChunks[i];
        if (chunk) {
          yield {
            chunk,
            done: i === responseChunks.length - 1
          };
        }
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const fullResponse = responseChunks.join('');
      const suggestedFields = this.extractSuggestedFields(fullResponse);

      // Save the complete response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        formId,
        metadata: suggestedFields ? { suggestedFields } : undefined
      };
      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        $push: { messages: assistantMessage }
      });

      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        status: 'completed',
        endedAt: new Date()
      });
    } catch (error) {
      logger.error('Error streaming message:', error);
      throw new Error('Failed to stream message');
    }
  }

  /**
   * Extract suggested field values from AI response
   */
  private extractSuggestedFields(response: string): Record<string, string> | undefined {
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      // Ignore JSON parsing errors
    }
    return undefined;
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(
    userId: mongoose.Types.ObjectId,
    sessionId: string
  ): Promise<ChatMessage[]> {
    try {
      const chatHistory = await ChatHistory.findOne({ sessionId, userId });
      if (!chatHistory) {
        throw new Error('Chat session not found');
      }
      return chatHistory.messages;
    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw new Error('Failed to get chat history');
    }
  }

  /**
   * End a chat session
   */
  async endChatSession(
    userId: mongoose.Types.ObjectId,
    sessionId: string
  ): Promise<void> {
    try {
      const chatHistory = await ChatHistory.findOne({ sessionId, userId });
      if (!chatHistory) {
        throw new Error('Chat session not found');
      }
      await ChatHistory.findByIdAndUpdate(chatHistory._id, {
        status: 'completed',
        endedAt: new Date()
      });
      logger.info(`Ended chat session: ${sessionId}`);
    } catch (error) {
      logger.error('Error ending chat session:', error);
      throw new Error('Failed to end chat session');
    }
  }

  /**
   * Get recent chat sessions
   */
  async getRecentSessions(
    userId: mongoose.Types.ObjectId,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const sessions = await ChatHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
      return sessions.map(session => ({
        sessionId: session.sessionId,
        formId: session.formId,
        status: session.status,
        messageCount: session.messages.length,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lastMessage: session.messages[session.messages.length - 1]
      }));
    } catch (error) {
      logger.error('Error getting recent sessions:', error);
      throw new Error('Failed to get recent sessions');
    }
  }

  /**
   * Clean up abandoned sessions
   */
  async cleanupAbandonedSessions(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await ChatHistory.updateMany(
        { status: 'active', updatedAt: { $lt: cutoffTime } },
        { status: 'abandoned' }
      );
      logger.info(`Cleaned up ${result.modifiedCount} abandoned sessions`);
    } catch (error) {
      logger.error('Error cleaning up sessions:', error);
    }
  }

  /**
   * Get AI assistance for a specific form
   */
  async getFormAssistance(
    userId: mongoose.Types.ObjectId,
    formFields: FormField[],
    currentValues: Record<string, string>
  ): Promise<string> {
    try {
      // Get user context for personalized suggestions
      const userContexts = await UserContext.find({ userId })
        .sort({ lastAccessed: -1, accessCount: -1 })
        .limit(20);

      // Analyze the form fields to detect form type
      const formAnalysis = await this.analyzeFormType(formFields);
      
      const context = {
        formFields,
        currentValues,
        formType: formAnalysis.type,
        formPurpose: formAnalysis.purpose,
        userContexts: userContexts.map(ctx => ({
          key: ctx.key,
          value: ctx.value,
          tags: ctx.tags,
          source: ctx.source
        })),
        hasUserData: userContexts.length > 0
      };

      const systemPrompt = `You are InfilloAI, analyzing a ${formAnalysis.type} form. 

**Form Analysis:**
- Type: ${formAnalysis.type}
- Purpose: ${formAnalysis.purpose}
- Fields: ${formFields.length} total fields
- Filled: ${Object.keys(currentValues).length} fields

**Your Task:**
1. Identify the most important unfilled fields
2. Provide specific suggestions for each field based on user context
3. Highlight any missing critical information
4. Suggest improvements for filled fields if needed

**Response Format:**
Provide clear, actionable advice for completing this ${formAnalysis.type} effectively.`;

      return await aiService.generateChatResponse(
        `Please analyze this form and provide assistance`,
        JSON.stringify(context),
        systemPrompt
      );
    } catch (error) {
      logger.error('Error getting form assistance:', error);
      throw new Error('Failed to get form assistance');
    }
  }

  /**
   * Analyze form type based on field patterns
   */
  private async analyzeFormType(formFields: FormField[]): Promise<{ type: string; purpose: string }> {
    const fieldNames = formFields.map(f => f.name.toLowerCase());
    const fieldLabels = formFields.map(f => (f.label || f.name).toLowerCase());
    const allFields = [...fieldNames, ...fieldLabels];

    // Job application patterns
    const jobKeywords = ['resume', 'cv', 'experience', 'position', 'salary', 'cover', 'employment', 'skills', 'education', 'degree'];
    const jobScore = jobKeywords.filter(keyword => allFields.some(field => field.includes(keyword))).length;

    // Contact/Registration patterns
    const contactKeywords = ['email', 'phone', 'address', 'name', 'contact', 'subscribe', 'newsletter'];
    const contactScore = contactKeywords.filter(keyword => allFields.some(field => field.includes(keyword))).length;

    // Survey/Feedback patterns
    const surveyKeywords = ['rating', 'feedback', 'opinion', 'satisfaction', 'recommend', 'experience', 'survey'];
    const surveyScore = surveyKeywords.filter(keyword => allFields.some(field => field.includes(keyword))).length;

    // Support/Service patterns
    const supportKeywords = ['issue', 'problem', 'support', 'ticket', 'help', 'inquiry', 'request'];
    const supportScore = supportKeywords.filter(keyword => allFields.some(field => field.includes(keyword))).length;

    // Registration/Account patterns
    const registrationKeywords = ['username', 'password', 'confirm', 'account', 'register', 'signup', 'profile'];
    const registrationScore = registrationKeywords.filter(keyword => allFields.some(field => field.includes(keyword))).length;

    // Determine form type based on highest score
    const scores: Record<string, number> = {
      'job application': jobScore,
      'contact form': contactScore,
      'survey/feedback': surveyScore,
      'support request': supportScore,
      'registration': registrationScore
    };

    const detectedType = Object.entries(scores).reduce((a, b) => {
      const aScore = a[1] || 0;
      const bScore = b[1] || 0;
      return aScore > bScore ? a : b;
    }, ['general form', 0] as [string, number]);
    
    if (detectedType[1] === 0) {
      return { type: 'general form', purpose: 'information collection' };
    }

    const purposes: Record<string, string> = {
      'job application': 'career opportunity submission',
      'contact form': 'communication and outreach',
      'survey/feedback': 'data collection and feedback',
      'support request': 'customer service assistance',
      'registration': 'account creation and onboarding'
    };

    return {
      type: detectedType[0],
      purpose: purposes[detectedType[0]] || 'information processing'
    };
  }

  /**
   * Detect form context from user message
   */
  async detectFormContext(message: string): Promise<{ 
    formType?: string; 
    confidence: number; 
    suggestions: string[] 
  }> {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Form type detection patterns
      const patterns = {
        'job application': [
          'job', 'application', 'apply', 'position', 'career', 'resume', 'cv', 'cover letter', 
          'employment', 'hiring', 'interview', 'work', 'company'
        ],
        'registration': [
          'register', 'signup', 'sign up', 'create account', 'join', 'membership', 'profile'
        ],
        'contact form': [
          'contact', 'message', 'inquiry', 'reach out', 'get in touch', 'support', 'help'
        ],
        'survey': [
          'survey', 'feedback', 'opinion', 'rating', 'review', 'questionnaire', 'poll'
        ],
        'application': [
          'application', 'apply', 'form', 'submit', 'request', 'admission', 'enrollment'
        ]
      };

      let bestMatch = { type: '', score: 0 };
      
      for (const [formType, keywords] of Object.entries(patterns)) {
        const score = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
        if (score > bestMatch.score) {
          bestMatch = { type: formType, score };
        }
      }

      const confidence = Math.min(bestMatch.score / 3, 1); // Normalize to 0-1

      // Generate suggestions based on detected form type
      const suggestions = this.getFormTypeSuggestions(bestMatch.type);

      return {
        formType: confidence > 0.3 ? bestMatch.type : undefined,
        confidence,
        suggestions
      };
    } catch (error) {
      logger.error('Error detecting form context:', error);
      return { confidence: 0, suggestions: [] };
    }
  }

  /**
   * Get suggestions based on form type
   */
  private getFormTypeSuggestions(formType: string): string[] {
    const suggestionMap: Record<string, string[]> = {
      'job application': [
        'Prepare your resume and cover letter',
        'Research the company and position',
        'Have your employment history ready',
        'Prepare examples of your achievements'
      ],
      'registration': [
        'Have your email address ready',
        'Choose a strong password',
        'Prepare personal information',
        'Check for verification requirements'
      ],
      'contact form': [
        'Be clear about your inquiry',
        'Provide relevant contact details',
        'Include specific details about your request',
        'Choose appropriate urgency level'
      ],
      'survey': [
        'Read questions carefully',
        'Provide honest feedback',
        'Consider the full range of options',
        'Add detailed comments where helpful'
      ],
      'application': [
        'Gather required documents',
        'Review eligibility requirements',
        'Prepare supporting information',
        'Double-check all details before submitting'
      ]
    };

    return suggestionMap[formType] || [
      'Review all required fields',
      'Prepare relevant information in advance',
      'Double-check your entries',
      'Save your progress if possible'
    ];
  }
}

// Export a singleton instance
export default new ChatService();

// Also export the class for testing
export { ChatService }; 