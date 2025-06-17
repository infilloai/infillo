import { GoogleGenAI, Type } from '@google/genai';
import { IAIProvider } from '../../types/providers';
import { ExtractedEntity, FormField, FieldSuggestion } from '../../types';
import logger from '../../utils/logger';

export class GoogleAIProvider implements IAIProvider {
  private ai: GoogleGenAI;
  private modelName: string;
  private embeddingModelName: string;

  constructor(config: { apiKey: string; model?: string; embeddingModel?: string }) {
    if (!config.apiKey) {
      throw new Error('Google AI API key is required');
    }

    this.ai = new GoogleGenAI({
      apiKey: config.apiKey
    });
    this.modelName = config.model || 'gemini-2.0-flash';
    this.embeddingModelName = config.embeddingModel || 'text-embedding-004';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: this.embeddingModelName,
        contents: [text],
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error('Failed to generate embedding: Invalid response from AI provider.');
      }
      return embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: `Extract all relevant entities from the following text. 
        Identify and categorize entities such as:
        - Person names
        - Email addresses
        - Phone numbers
        - Addresses
        - Organizations/Companies
        - Job titles
        - URLs
        - Dates
        - Skills or qualifications
        
        Text: ${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: "The category/type of the entity"
                },
                value: {
                  type: Type.STRING,
                  description: "The actual entity value"
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Confidence level between 0 and 100 (percentage)"
                },
                context: {
                  type: Type.STRING,
                  description: "Surrounding text that helps understand the entity"
                }
              },
              required: ["type", "value", "confidence"]
            }
          }
        }
      });
      
      console.log('🔍 GoogleAI: Structured entities received:', response.text);
      
      const responseText = response.text;
      if (!responseText) {
        logger.warn('🔍 GoogleAI: Empty response received for entity extraction.');
        return [];
      }
      const entities = JSON.parse(responseText);
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      logger.error('Error extracting entities:', error);
      console.error('🔍 GoogleAI: Entity extraction error details:', error);
      throw new Error('Failed to extract entities');
    }
  }

  async analyzeFormFields(fields: FormField[]): Promise<FormField[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: `Analyze the following form fields and determine their semantic intent: ${JSON.stringify(fields, null, 2)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "The field name"
                },
                label: {
                  type: Type.STRING,
                  description: "The field label"
                },
                type: {
                  type: Type.STRING,
                  description: "The field type"
                },
                value: {
                  type: Type.STRING,
                  description: "The field value"
                },
                context: {
                  type: Type.STRING,
                  description: "Additional context about the field"
                },
                required: {
                  type: Type.BOOLEAN,
                  description: "Whether the field is required"
                },
                readonly: {
                  type: Type.BOOLEAN,
                  description: "Whether the field is readonly"
                },
                placeholder: {
                  type: Type.STRING,
                  description: "The field placeholder"
                },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING
                  },
                  description: "Options for select fields"
                }
              },
              required: ["name", "label", "type"]
            }
          }
        }
      });
      
      console.log('🔍 GoogleAI: Structured form analysis received:', response.text);
      
      const responseText = response.text;
      if (!responseText) {
        logger.warn('🔍 GoogleAI: Empty response received for form analysis.');
        return fields;
      }
      const enhancedFields = JSON.parse(responseText);
      
      return Array.isArray(enhancedFields) ? enhancedFields : fields;
    } catch (error) {
      logger.error('Error analyzing form fields:', error);
      console.error('🔍 GoogleAI: Form analysis error details:', error);
      return fields; // Return original fields if analysis fails
    }
  }

  async generateAutofillSuggestions(
    fields: FormField[],
    userContexts: any[],
    formContext?: string
  ): Promise<FieldSuggestion[]> {
    try {
      const prompt = `
        **Objective:** Generate autofill suggestions for a web form based *only* on the provided context.

        **CRITICAL INSTRUCTIONS:**
        1.  **Strictly Adhere to Context:** You MUST use ONLY the data within the "Available User Context" to generate suggestions.
        2.  **Do Not Invent Information:** If the context does not contain a relevant value for a field, DO NOT provide a suggestion for that field. Do not use external knowledge or make assumptions.
        3.  **Match Fields to Context:** Carefully match each form field in "Form Fields" with the most relevant data points in "Available User Context".
        4.  **Return Empty for No Match:** If no relevant information can be found in the context for ANY of the fields, return an empty array.

        **Input Data:**
        - **Form Context:** ${formContext || 'General form'}
        - **Form Fields:** ${JSON.stringify(fields, null, 2)}
        - **Available User Context:** ${JSON.stringify(userContexts, null, 2)}
      `;

      console.log('🔍 GoogleAI: Sending request with fields:', fields.map(f => f.name));
      console.log('🔍 GoogleAI: User contexts available:', userContexts.length);

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fieldName: {
                  type: Type.STRING,
                  description: "The name of the field"
                },
                suggestedValue: {
                  type: Type.STRING,
                  description: "The suggested value for the field - MUST NOT BE EMPTY"
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Confidence level between 0 and 100 (percentage)"
                },
                source: {
                  type: Type.STRING,
                  description: "Brief description of the source"
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Brief explanation of why this suggestion is appropriate"
                }
              },
              required: ["fieldName", "suggestedValue", "confidence", "source", "reasoning"]
            }
          }
        }
      });
      
      console.log('🔍 GoogleAI: Structured response received:', response.text);
      
      const responseText = response.text;
      if (!responseText) {
        logger.warn('🔍 GoogleAI: Empty response received for suggestions.');
        return [];
      }
      const suggestions = JSON.parse(responseText);
      console.log('🔍 GoogleAI: Parsed suggestions:', suggestions);
      
      // Validate that all suggestions have required fields and non-empty values
      const validSuggestions = suggestions.filter((suggestion: any) => {
        const hasRequiredFields = suggestion.fieldName && 
                                 suggestion.suggestedValue && 
                                 typeof suggestion.confidence === 'number' &&
                                 suggestion.source &&
                                 suggestion.reasoning;
        
        const hasValidValue = suggestion.suggestedValue && 
                             suggestion.suggestedValue.trim().length > 0;
        
        const isValid = hasRequiredFields && hasValidValue;
        
        if (!isValid) {
          console.warn('🔍 GoogleAI: Filtering out invalid suggestion:', {
            fieldName: suggestion.fieldName,
            hasValue: !!suggestion.suggestedValue,
            valueLength: suggestion.suggestedValue?.length || 0,
            hasRequiredFields,
            hasValidValue
          });
        }
        
        return isValid;
      }).map((suggestion: any) => {
        // Handle confidence values - convert 0-1 range to 0-100 if needed
        let confidence = suggestion.confidence;
        
        // If confidence is between 0-1, convert to percentage
        if (confidence >= 0 && confidence <= 1) {
          confidence = confidence * 100;
        }
        
        // Ensure confidence is within valid range (0-100)
        const clampedConfidence = Math.max(0, Math.min(100, confidence));
        
        if (suggestion.confidence !== clampedConfidence) {
          console.warn('🔍 GoogleAI: Adjusting confidence value:', {
            fieldName: suggestion.fieldName,
            originalConfidence: suggestion.confidence,
            convertedConfidence: confidence,
            clampedConfidence
          });
        }
        
        return {
          ...suggestion,
          confidence: clampedConfidence
        };
      });
      
      console.log('🔍 GoogleAI: Valid suggestions count:', validSuggestions.length);
      console.log('🔍 GoogleAI: Valid suggestions:', validSuggestions.map((s: FieldSuggestion) => ({
        fieldName: s.fieldName,
        valueLength: s.suggestedValue?.length,
        confidence: s.confidence
      })));
      
      return validSuggestions;
    } catch (error) {
      logger.error('Error generating autofill suggestions:', error);
      console.error('🔍 GoogleAI: Full error details:', error);
      return [];
    }
  }

  async generateChatResponse(
    message: string,
    context: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const fullPrompt = `${systemPrompt || 'You are a helpful AI assistant.'}
      
      Context: ${context}
      
      User: ${message}
      
      Assistant:`;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: fullPrompt
      });
      
      return response.text || '';
    } catch (error) {
      logger.error('Error generating chat response:', error);
      throw new Error('Failed to generate response');
    }
  }

  async streamChatResponse(
    message: string,
    context: string,
    onChunk: (chunk: string) => void,
    systemPrompt?: string
  ): Promise<void> {
    try {
      const fullPrompt = `${systemPrompt || 'You are a helpful AI assistant.'}
      
      Context: ${context}
      
      User: ${message}
      
      Assistant:`;

      // Note: @google/genai doesn't have streaming support yet
      // Fallback to regular generation and simulate streaming
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: fullPrompt
      });
      
      // Simulate streaming by sending chunks
      const text = response.text;
      if (!text) {
        return; // Nothing to stream
      }
      const chunkSize = 50;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to simulate streaming
      }
    } catch (error) {
      logger.error('Error streaming chat response:', error);
      throw new Error('Failed to stream response');
    }
  }

  async explainFieldSuggestion(
    field: FormField,
    suggestedValue: string,
    userContext: any[]
  ): Promise<string> {
    try {
      const prompt = `Explain why the following value was suggested for this form field.
      
      Field: ${JSON.stringify(field)}
      Suggested Value: ${suggestedValue}
      
      Available Context:
      ${JSON.stringify(userContext, null, 2)}
      
      Provide a clear, concise explanation that helps the user understand the reasoning.`;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt
      });
      
      return response.text || 'Unable to generate explanation at this time.';
    } catch (error) {
      logger.error('Error explaining field suggestion:', error);
      return 'Unable to generate explanation at this time.';
    }
  }

  async refineFieldValue(
    field: FormField,
    currentValue: string,
    userFeedback: string,
    userContext: any[]
  ): Promise<string> {
    try {
      const prompt = `Refine the value for a form field based on user feedback.
      
      Field: ${JSON.stringify(field)}
      Current Value: ${currentValue}
      User Feedback: ${userFeedback}
      
      Available Context:
      ${JSON.stringify(userContext, null, 2)}
      
      Generate an improved value that addresses the user's feedback while maintaining accuracy.
      Return only the refined value, no explanation.`;

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt
      });
      
      return response.text?.trim() || currentValue;
    } catch (error) {
      logger.error('Error refining field value:', error);
      return currentValue; // Return original value if refinement fails
    }
  }
} 