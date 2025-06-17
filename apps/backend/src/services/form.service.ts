import mongoose from 'mongoose';
import { JSDOM } from 'jsdom';
import aiService from './ai.service';
import UserContext from '../models/UserContext';
import FormHistory from '../models/FormHistory';
import FormTemplate from '../models/FormTemplate';
import logger from '../utils/logger';
import { 
  FormField, 
  AutofillRequest, 
  AutofillResponse, 
  FormFeedback,
  VectorSearchResult
} from '../types';

class FormService {
  /**
   * Detect form fields from HTML
   */
  async detectFormFields(html: string): Promise<FormField[]> {
    try {
      // Parse HTML to extract form fields
      const fields = this.extractFieldsFromHTML(html);
      console.log('fields', fields);
      
      // Enhance fields with AI analysis
      const enhancedFields = await aiService.analyzeFormFields(fields);
      
      // Validate and fix any fields that might have lost their labels during AI processing
      const validatedFields = enhancedFields.map((field, index) => {
        // Ensure each field has a valid label
        if (!field.label || field.label.trim() === '') {
          // Use the original field's label as fallback
          const originalField = fields[index];
          field.label = originalField?.label || this.generateLabelFromId(field.name) || field.name || 'Field';
          console.log(`⚠️  Fixed missing label for field ${field.name}: "${field.label}"`);
        }
        
        // Ensure other required fields exist
        if (!field.name) {
          field.name = `field_${index}`;
        }
        if (!field.type) {
          field.type = 'text';
        }
        
        return field;
      });
      
      console.log('✅ Final validated fields:', validatedFields);
      return validatedFields;
    } catch (error) {
      logger.error('Error detecting form fields:', error);
      throw new Error('Failed to detect form fields');
    }
  }

  /**
   * Extract fields from HTML (using proper HTML parser)
   */
  private extractFieldsFromHTML(html: string): FormField[] {
    try {
      console.log('=== DEBUG: Starting extractFieldsFromHTML ===');
      console.log('HTML length:', html.length);
      console.log('HTML sample:', html.substring(0, 500));
      
      // Use proper HTML parser instead of regex
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const fields: FormField[] = [];
      const processedNames = new Set<string>();
      
      // Extract all form fields according to HTML standards
      const formElements = document.querySelectorAll('input, textarea, select');
      console.log('Found form elements:', formElements.length);
      
      formElements.forEach((element: any, index: number) => {
        console.log(`\n--- Processing element ${index + 1} ---`);
        console.log('Tag:', element.tagName);
        console.log('Name:', element.getAttribute('name'));
        console.log('Type:', element.getAttribute('type'));
        console.log('ID:', element.getAttribute('id'));
        console.log('Disabled:', element.hasAttribute('disabled'));
        console.log('Outer HTML:', element.outerHTML);
        
        const field = this.extractFieldData(element, document);
        console.log('Extracted field:', field);
        
        // Only add fields with identifiers and avoid duplicates
        if (field && field.name && !processedNames.has(field.name)) {
          fields.push(field);
          processedNames.add(field.name);
          console.log('✓ Field added to results');
        } else {
          console.log('✗ Field rejected:', {
            hasField: !!field,
            hasName: field?.name,
            isDuplicate: field?.name ? processedNames.has(field.name) : false
          });
        }
      });
      
      console.log('\n=== Final Results ===');
      console.log('Total fields extracted:', fields.length);
      console.log('Fields:', JSON.stringify(fields, null, 2));
      
      return fields;
    } catch (error) {
      console.error('Error parsing HTML for form fields:', error);
      return this.fallbackExtraction(html);
    }
  }

  private extractFieldData(element: any, document: any): FormField | null {
    const tagName = element.tagName.toLowerCase();
    
    // Get basic attributes
    const name = element.getAttribute('name');
    const id = element.getAttribute('id');
    const type = element.getAttribute('type') || 'text';
    const placeholder = element.getAttribute('placeholder');
    const required = element.hasAttribute('required');
    const disabled = element.hasAttribute('disabled');
    const readonly = element.hasAttribute('readonly');
    
    console.log('  extractFieldData - attributes:', {
      tagName, name, id, type, placeholder, required, disabled, readonly
    });
    
    // Use name OR id as field identifier (modern forms often use id instead of name)
    const fieldIdentifier = name || id;
    
    // Skip fields without any identifier or that are disabled/hidden
    if (!fieldIdentifier || disabled || type === 'hidden') {
      console.log('  ✗ Skipping field - reason:', {
        noIdentifier: !fieldIdentifier,
        disabled,
        hidden: type === 'hidden'
      });
      return null;
    }
    
    // Determine field type according to HTML standards
    let fieldType = 'text';
    if (tagName === 'textarea') {
      fieldType = 'textarea';
    } else if (tagName === 'select') {
      fieldType = 'select';
    } else if (tagName === 'input') {
      // Map HTML5 input types
      const validInputTypes = [
        'text', 'email', 'password', 'tel', 'url', 'search', 
        'number', 'date', 'time', 'datetime-local', 'month', 
        'week', 'color', 'range', 'file', 'checkbox', 'radio'
      ];
      fieldType = validInputTypes.includes(type) ? type : 'text';
    }
    
    console.log('  Field type determined:', fieldType);
    
    // Skip non-data input types
    if (['submit', 'button', 'reset', 'image'].includes(type)) {
      console.log('  ✗ Skipping non-data input type:', type);
      return null;
    }
    
    // Extract label using multiple strategies (HTML standards)
    const label = this.extractFieldLabel(element, document, fieldIdentifier, id);
    console.log('  Label extracted:', label);
    
    // Extract options for select fields
    const options = tagName === 'select' ? this.extractSelectOptions(element) : undefined;
    console.log('  Options extracted:', options);
    
    // Ensure we always have a valid label (never null/empty)
    let finalLabel = label?.trim() || placeholder?.trim() || this.generateLabelFromId(fieldIdentifier) || fieldIdentifier;
    
    // Bulletproof check - ensure finalLabel is never empty or just whitespace
    if (!finalLabel || finalLabel.trim() === '') {
      finalLabel = fieldIdentifier || 'Field';
    }
    
    console.log('  📝 Label fallback process:', {
      extractedLabel: label,
      placeholder: placeholder,
      generatedLabel: this.generateLabelFromId(fieldIdentifier),
      fieldIdentifier: fieldIdentifier,
      finalLabel: finalLabel,
      finalLabelLength: finalLabel?.length || 0
    });
    
    const result = {
      name: fieldIdentifier, // Use name if available, otherwise use id
      label: finalLabel.trim(), // Guaranteed non-empty label
      type: fieldType,
      required,
      readonly,
      placeholder,
      options
    };
    
    console.log('  ✓ Field data created:', result);
    console.log('  🔍 Label validation check:', {
      labelExists: !!result.label,
      labelLength: result.label?.length || 0,
      labelContent: result.label
    });
    return result;
  }

  private extractFieldLabel(element: any, document: any, name: string, id?: string | null): string | null {
    console.log('    🏷️  Starting label extraction for:', name, 'id:', id);
    
    // Strategy 1: aria-label (highest priority)
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel?.trim()) {
      console.log('    ✓ Found aria-label:', ariaLabel.trim());
      return ariaLabel.trim();
    }
    console.log('    ✗ No aria-label found');
    
    // Strategy 2: aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        const labelText = labelElement.textContent?.trim();
        console.log('    ✓ Found aria-labelledby:', labelText);
        return labelText || null;
      }
    }
    console.log('    ✗ No aria-labelledby found');
    
    // Strategy 3: Associated label via 'for' attribute
    if (id) {
      const associatedLabel = document.querySelector(`label[for="${id}"]`);
      if (associatedLabel) {
        const labelText = this.cleanLabelText(associatedLabel.textContent);
        console.log('    ✓ Found associated label:', labelText);
        return labelText;
      }
    }
    console.log('    ✗ No associated label found');
    
    // Strategy 4: Wrapping label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Get label text excluding the input element's text
      const labelText = this.cleanLabelText(parentLabel.textContent);
      console.log('    ✓ Found wrapping label:', labelText);
      return labelText;
    }
    console.log('    ✗ No wrapping label found');
    
    // Strategy 5: Previous sibling label
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === 'label') {
        const labelText = this.cleanLabelText(sibling.textContent);
        console.log('    ✓ Found sibling label:', labelText);
        return labelText;
      }
      if (sibling.tagName.toLowerCase() === 'span' && sibling.textContent?.trim()) {
        const labelText = this.cleanLabelText(sibling.textContent);
        console.log('    ✓ Found sibling span:', labelText);
        return labelText;
      }
      sibling = sibling.previousElementSibling;
    }
    console.log('    ✗ No sibling labels found');
    
    // Strategy 6: Look for nearby text nodes or spans
    const parentElement = element.parentElement;
    if (parentElement) {
      const beforeText = this.findNearbyText(parentElement, element, 'before');
      if (beforeText) {
        console.log('    ✓ Found nearby text:', beforeText);
        return beforeText;
      }
    }
    console.log('    ✗ No nearby text found');
    
    console.log('    🚫 All label extraction strategies failed');
    return null;
  }

  private extractSelectOptions(selectElement: any): string[] | undefined {
    const options: string[] = [];
    const optionElements = selectElement.querySelectorAll('option');
    
    optionElements.forEach((option: any) => {
      const value = option.getAttribute('value') || option.textContent?.trim();
      if (value && value !== '') {
        options.push(value);
      }
    });
    
    return options.length > 0 ? options : undefined;
  }

  private cleanLabelText(text: string | null): string | null {
    if (!text || typeof text !== 'string') return null;
    
    const cleaned = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[*:]\s*$/, '') // Remove trailing asterisks or colons
      .trim();
    
    // Return null if the cleaned text is empty (this helps with our fallback logic)
    return cleaned.length > 0 ? cleaned : null;
  }

  private findNearbyText(container: any, targetElement: any, direction: 'before' | 'after'): string | null {
    const walker = container.ownerDocument.createTreeWalker(
      container,
      3, // NodeFilter.SHOW_TEXT
      null,
      false
    );
    
    let node;
    let foundTarget = false;
    const textNodes: any[] = [];
    
    while (node = walker.nextNode()) {
      if (node.parentElement === targetElement || targetElement.contains(node.parentElement!)) {
        foundTarget = true;
        continue;
      }
      
      if (direction === 'before' && !foundTarget) {
        textNodes.push(node);
      } else if (direction === 'after' && foundTarget) {
        const text = node.textContent?.trim();
        if (text && text.length > 2) {
          return text;
        }
      }
    }
    
    if (direction === 'before' && textNodes.length > 0) {
      // Get the last text node before the element
      const lastText = textNodes[textNodes.length - 1].textContent?.trim();
      if (lastText && lastText.length > 2) {
        return lastText;
      }
    }
    
    return null;
  }

  private fallbackExtraction(html: string): FormField[] {
    // Improved regex fallback for when JSDOM fails
    const fields: FormField[] = [];
    
    // More comprehensive regex patterns
    const fieldPatterns = [
      // Input fields with various quote styles and attributes
      /<input[^>]*?name\s*=\s*["']([^"']+)["'][^>]*?(?:type\s*=\s*["']([^"']+)["'])?[^>]*>/gi,
      // Textarea fields
      /<textarea[^>]*?name\s*=\s*["']([^"']+)["'][^>]*>/gi,
      // Select fields
      /<select[^>]*?name\s*=\s*["']([^"']+)["'][^>]*>/gi
    ];
    
    fieldPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const name = match[1];
        const type = match[2] || (index === 1 ? 'textarea' : index === 2 ? 'select' : 'text');
        
        if (name && !fields.some(f => f.name === name)) {
          fields.push({
            name,
            label: name,
            type: type === 'submit' || type === 'button' ? 'text' : type
          });
        }
      }
    });
    
    return fields;
  }

  /**
   * Generate autofill suggestions
   */
  async generateAutofillSuggestions(
    userId: mongoose.Types.ObjectId,
    request: AutofillRequest
  ): Promise<AutofillResponse> {
    try {
      const suggestions: AutofillResponse = {};
      
      // Get user context for AI
      const userContext = await UserContext.find({ userId }).limit(50);
      
      // Use AI to generate suggestions for all fields at once
      const aiSuggestions = await aiService.generateAutofillSuggestions(
        request.fields,
        userContext,
        request.formContext
      );
      
      // Group suggestions by field name
      for (const suggestion of aiSuggestions) {
        if (!suggestions[suggestion.fieldName]) {
          suggestions[suggestion.fieldName] = [];
        }
        suggestions[suggestion.fieldName]!.push(suggestion);
      }
      
      // For fields with no suggestions, try individual context search
      for (const field of request.fields) {
        if (!suggestions[field.name] || suggestions[field.name]!.length === 0) {
          try {
            const fieldKey = `${field.label} ${field.name} ${field.context || ''}`;
            const embedding = await aiService.generateEmbedding(fieldKey);
            const searchResults = await this.searchUserContext(userId, embedding, 3);
            
            if (searchResults.length > 0) {
              const relevantContext = await UserContext.find({
                _id: { $in: searchResults.map(r => r.document._id) }
              });
              
              // Generate suggestions for this specific field
              const fieldSuggestions = await aiService.generateAutofillSuggestions(
                [field],
                relevantContext,
                request.formContext
              );
              
              suggestions[field.name] = fieldSuggestions.filter(s => s.fieldName === field.name);
              
              // Update access tracking
              if (searchResults[0]?.document) {
                await UserContext.findByIdAndUpdate(searchResults[0].document._id, {
                  $inc: { accessCount: 1 },
                  lastAccessed: new Date()
                });
              }
            } else {
              suggestions[field.name] = [];
            }
          } catch (error) {
            logger.warn(`Failed to generate suggestions for field ${field.name}:`, error);
            suggestions[field.name] = [];
          }
        }
      }
      
      return suggestions;
    } catch (error) {
      logger.error('Error generating autofill suggestions:', error);
      throw new Error('Failed to generate suggestions');
    }
  }

  /**
   * Search user context using vector similarity
   */
  private async searchUserContext(
    userId: mongoose.Types.ObjectId,
    queryEmbedding: number[],
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      // Use MongoDB Atlas Vector Search without filter, then filter by userId
      const results = await UserContext.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: Math.max(limit * 20, 200), // Increased to account for filtering
            limit: limit * 5 // Get more results since we'll filter afterwards
          }
        },
        {
          $match: {
            userId: userId // Filter by userId after vector search
          }
        },
        {
          $project: {
            key: 1,
            value: 1,
            tags: 1,
            source: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $match: {
            score: { $gte: 0.7 } // Minimum similarity threshold
          }
        },
        {
          $limit: limit // Final limit after filtering
        }
      ]);
      
      return results.map(doc => ({
        document: doc,
        score: doc.score
      }));
    } catch (error) {
      logger.error('Error in vector search:', error);
      // Fallback to text search if vector search fails
      return this.fallbackTextSearch(userId, limit);
    }
  }

  /**
   * Fallback text search when vector search is unavailable
   */
  private async fallbackTextSearch(
    userId: mongoose.Types.ObjectId,
    limit: number
  ): Promise<VectorSearchResult[]> {
    const contexts = await UserContext.find({ userId })
      .sort({ lastAccessed: -1, accessCount: -1 })
      .limit(limit);
    
    return contexts.map(ctx => ({
      document: ctx,
      score: 1.0
    }));
  }

  /**
   * Save form submission to history
   */
  async saveFormSubmission(
    userId: mongoose.Types.ObjectId,
    formData: {
      formId: string;
      fields: FormField[];
      filledValues: Record<string, string>;
      domain: string;
      url: string;
      templateId?: string;
    }
  ): Promise<any> {
    try {
      const formHistory = await FormHistory.create({
        userId,
        ...formData,
        submittedAt: new Date()
      });
      
      // Update template usage if provided
      if (formData.templateId) {
        await FormTemplate.findByIdAndUpdate(formData.templateId, {
          $inc: { usageCount: 1 },
          lastUsed: new Date()
        });
      }
      
      // Create context entries from filled values
      await this.createContextFromFormSubmission(userId, formData.fields, formData.filledValues);
      
      return formHistory;
    } catch (error) {
      logger.error('Error saving form submission:', error);
      throw new Error('Failed to save form submission');
    }
  }

  /**
   * Create user context from form submission
   */
  private async createContextFromFormSubmission(
    userId: mongoose.Types.ObjectId,
    fields: FormField[],
    filledValues: Record<string, string>
  ): Promise<void> {
    const contextEntries = [];
    
    for (const field of fields) {
      const value = filledValues[field.name];
      if (!value) continue;
      
      // Generate embedding for the value
      const embedding = await aiService.generateEmbedding(value);
      
      const contextData = {
        userId,
        key: field.label || field.name,
        value,
        tags: [field.context || 'form', field.type],
        embedding,
        metadata: {
          fieldName: field.name,
          fieldType: field.type,
          fieldContext: field.context
        },
        source: 'form' as const
      };
      
      contextEntries.push(contextData);
    }
    
    if (contextEntries.length > 0) {
      await UserContext.insertMany(contextEntries);
    }
  }

  /**
   * Add feedback for a form field
   */
  async addFormFeedback(
    userId: mongoose.Types.ObjectId,
    formId: string,
    feedback: FormFeedback
  ): Promise<void> {
    try {
      const formHistory = await FormHistory.findOne({ userId, formId });
      if (!formHistory) {
        throw new Error('Form submission not found');
      }
      
      // Add feedback to form history
      await FormHistory.findByIdAndUpdate(formHistory._id, {
        $push: { feedback }
      });
      
      // Update or create correct context value
      const field = formHistory.fields.find(f => f.name === feedback.field);
      if (field) {
        const embedding = await aiService.generateEmbedding(feedback.correctValue);
        
        await UserContext.findOneAndUpdate(
          {
            userId,
            key: field.label || field.name,
            source: 'form'
          },
          {
            value: feedback.correctValue,
            embedding,
            lastAccessed: new Date(),
            $inc: { accessCount: 1 }
          },
          { upsert: true }
        );
      }
      
      logger.info(`Feedback recorded for field ${feedback.field}`);
    } catch (error) {
      logger.error('Error adding form feedback:', error);
      throw new Error('Failed to add feedback');
    }
  }

  /**
   * Explain why a value was suggested
   */
  async explainFieldSuggestion(
    userId: mongoose.Types.ObjectId,
    fieldName: string,
    value: string
  ): Promise<string> {
    try {
      // Find relevant context that might have influenced the suggestion
      const embedding = await aiService.generateEmbedding(`${fieldName} ${value}`);
      const searchResults = await this.searchUserContext(userId, embedding, 3);
      
      const relevantContext = await UserContext.find({
        _id: { $in: searchResults.map(r => r.document._id) }
      });
      
      // Create a basic FormField object for the explanation
      const field: FormField = {
        name: fieldName,
        label: fieldName,
        type: 'text'
      };
      
      const explanation = await aiService.explainFieldSuggestion(
        field,
        value,
        relevantContext
      );
      
      return explanation;
    } catch (error) {
      logger.error('Error explaining field suggestion:', error);
      throw new Error('Failed to explain suggestion');
    }
  }

  /**
   * Refine a field value based on user input
   */
  async refineFieldValue(
    userId: mongoose.Types.ObjectId,
    fieldName: string,
    previousValue: string,
    userPrompt: string
  ): Promise<string> {
    try {
      // Get user context for refinement
      const userContext = await UserContext.find({ userId }).limit(10);
      
      // Create a basic FormField object
      const field: FormField = {
        name: fieldName,
        label: fieldName,
        type: 'text'
      };
      
      const refinedValue = await aiService.refineFieldValue(
        field,
        previousValue,
        userPrompt,
        userContext
      );
      
      return refinedValue;
    } catch (error) {
      logger.error('Error refining field value:', error);
      throw new Error('Failed to refine value');
    }
  }

  /**
   * Generate a human-readable label from field identifier
   */
  private generateLabelFromId(identifier: string): string {
    if (!identifier) return 'Field';
    
    return identifier
      // Handle camelCase: firstName -> first Name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Handle kebab-case and snake_case: first-name -> first name
      .replace(/[-_]/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, letter => letter.toUpperCase())
      .trim();
  }
}

export default new FormService(); 