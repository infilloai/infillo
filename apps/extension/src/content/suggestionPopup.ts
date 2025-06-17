/**
 * Suggestion Popup Component for InfilloAI Extension
 * Shows autofill suggestions when user clicks on form field widget
 */

import { CSSIsolation } from '@/utils/cssIsolation';
import { apiService } from '../utils/apiService';

export interface SuggestionData {
  value: string;
  source: string;
  confidence: number;
  fieldType: string;
  fieldName: string;
  isLoading?: boolean;
  error?: string;
}

export interface MultipleSuggestionsData {
  suggestions: SuggestionData[];
  currentIndex: number;
  fieldType: string;
  fieldName: string;
  isLoading?: boolean;
  error?: string;
}

export class SuggestionPopup {
  private popup: HTMLElement | null = null;
  private field: HTMLElement | null = null;
  private onAccept?: (value: string) => void;
  private onReject?: () => void;
  private currentSuggestions: MultipleSuggestionsData | null = null;
  private formId?: string; // Store formId for refine functionality

  constructor() {
    // No longer need apiService since entity extraction was removed
  }

  /**
   * Show suggestion popup with API-powered suggestions
   */
  async showWithField(field: HTMLElement, fieldInfo: {
    type: string;
    name: string;
    label: string;
  }, callbacks: {
    onAccept?: (value: string) => void;
    onReject?: () => void;
  } = {}): Promise<void> {
    console.log('SuggestionPopup: showWithField() called with:', { field, fieldInfo, callbacks });
    
    try {
      // Hide any existing popup first (but preserve callbacks)
      if (this.popup) {
        document.body.removeChild(this.popup);
        this.popup = null;
      }
      
      // Set field and callback references AFTER hiding existing popup
      this.field = field;
      this.onAccept = callbacks.onAccept;
      this.onReject = callbacks.onReject;
      this.formId = undefined; // Legacy method - no formId support, so no edit button
      
      // Show loading popup first
      const loadingSuggestion: SuggestionData = {
        value: 'Loading suggestions...',
        source: 'InfilloAI',
        confidence: 0,
        fieldType: fieldInfo.label || fieldInfo.type,
        fieldName: fieldInfo.name,
        isLoading: true
      };
      
      console.log('SuggestionPopup: Showing loading popup...');
      this.popup = this.createPopup(loadingSuggestion);
      this.positionPopup(field);
      document.body.appendChild(this.popup);
      
      // Force immediate visibility
      this.popup.style.display = 'block';
      this.popup.style.visibility = 'visible';
      this.popup.style.opacity = '1';
      
      // Get suggestions from API
      try {
        const multipleSuggestions = await this.getMultipleSuggestionsFromAPI(fieldInfo);
        this.currentSuggestions = multipleSuggestions;
        
        // Update popup with real suggestions
        if (this.popup) {
          document.body.removeChild(this.popup);
          this.popup = null;
        }
        this.popup = this.createMultipleSuggestionsPopup(multipleSuggestions, undefined);
        this.positionPopup(field);
        document.body.appendChild(this.popup);
        
        // Force immediate visibility and animate
        this.popup.style.display = 'block';
        this.popup.style.visibility = 'visible';
        this.popup.style.opacity = '1';
        
        requestAnimationFrame(() => {
          if (this.popup) {
            const shadowRoot = this.popup.shadowRoot;
            if (shadowRoot) {
              const popupElement = shadowRoot.querySelector('.suggestion-popup') as HTMLElement;
              if (popupElement) {
                popupElement.style.opacity = '1';
                popupElement.style.transform = 'translateY(0)';
              }
            }
          }
        });
        
      } catch (error) {
        console.error('SuggestionPopup: Error getting suggestions:', error);
        
        // Show error popup
        const errorSuggestions: MultipleSuggestionsData = {
          suggestions: [{
            value: 'Failed to load suggestions',
            source: 'InfilloAI',
            confidence: 0,
            fieldType: fieldInfo.label || fieldInfo.type,
            fieldName: fieldInfo.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          currentIndex: 0,
          fieldType: fieldInfo.label || fieldInfo.type,
          fieldName: fieldInfo.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        this.currentSuggestions = errorSuggestions;
        if (this.popup) {
          document.body.removeChild(this.popup);
          this.popup = null;
        }
        this.popup = this.createMultipleSuggestionsPopup(errorSuggestions, undefined);
        this.positionPopup(field);
        document.body.appendChild(this.popup);
        
        // Force immediate visibility
        this.popup.style.display = 'block';
        this.popup.style.visibility = 'visible';
        this.popup.style.opacity = '1';
      }
      
    } catch (error) {
      console.error('SuggestionPopup: Error in showWithField():', error);
    }
  }

  /**
   * Show suggestion popup (legacy method for backward compatibility)
   */
  show(field: HTMLElement, suggestion: SuggestionData, callbacks: {
    onAccept?: (value: string) => void;
    onReject?: () => void;
  } = {}): void {
    console.log('SuggestionPopup: show() called with:', { field, suggestion, callbacks });
    
    try {
      // Hide any existing popup first (but preserve callbacks)
      if (this.popup) {
        document.body.removeChild(this.popup);
        this.popup = null;
      }
      
      // Set field and callback references AFTER hiding existing popup
      this.field = field;
      this.onAccept = callbacks.onAccept;
      this.onReject = callbacks.onReject;
      
      console.log('SuggestionPopup: Creating popup...');
      this.popup = this.createPopup(suggestion);
      console.log('SuggestionPopup: Popup created:', this.popup);
      
      this.positionPopup(field);
      console.log('SuggestionPopup: Popup positioned');
      
      // Add to page
      document.body.appendChild(this.popup);
      console.log('SuggestionPopup: Popup added to body');
      
      // Force immediate visibility for debugging
      this.popup.style.display = 'block';
      this.popup.style.visibility = 'visible';
      this.popup.style.opacity = '1';
      
      // Show with animation
      requestAnimationFrame(() => {
        if (this.popup) {
          const shadowRoot = this.popup.shadowRoot;
          console.log('SuggestionPopup: Shadow root:', shadowRoot);
          if (shadowRoot) {
            const popupElement = shadowRoot.querySelector('.suggestion-popup') as HTMLElement;
            console.log('SuggestionPopup: Popup element in shadow:', popupElement);
            if (popupElement) {
              popupElement.style.opacity = '1';
              popupElement.style.transform = 'translateY(0)';
              console.log('SuggestionPopup: Animation applied');
            }
          }
        }
      });
    } catch (error) {
      console.error('SuggestionPopup: Error in show():', error);
    }
  }

  /**
   * Get multiple suggestions from API
   */
  private async getMultipleSuggestionsFromAPI(fieldInfo: {
    type: string;
    name: string;
    label: string;
  }): Promise<MultipleSuggestionsData> {
    try {
      const allSuggestions: SuggestionData[] = [];

      // Try to get API suggestions first
      try {
        // Note: getAutofillSuggestions has been removed in favor of formId-based workflow
        // This fallback will be handled by the entity and browser suggestions below
      } catch (apiError) {
        console.warn('SuggestionPopup: API suggestions unavailable:', apiError);
        
        // If this is an authentication error, throw it to be handled at the top level
        if (this.isAuthenticationError(apiError)) {
          throw apiError;
        }
        // Continue to try other sources for other errors
      }

      // Sort suggestions by confidence (highest first)
      allSuggestions.sort((a, b) => b.confidence - a.confidence);

      // Only add fallback suggestions if we have no real suggestions (confidence > 0)
      const hasRealSuggestions = allSuggestions.some(s => s.confidence > 0);
      
      if (!hasRealSuggestions) {
        const fallbackSuggestions = this.getFallbackSuggestions(fieldInfo);
        fallbackSuggestions.forEach(fallback => {
          const isDuplicate = allSuggestions.some(s => s.value.toLowerCase() === fallback.value.toLowerCase());
          if (!isDuplicate) {
            allSuggestions.push(fallback);
          }
        });
      }

      // If still no suggestions found, return helpful message
      if (allSuggestions.length === 0) {
        allSuggestions.push({
          value: 'Please sign in to get personalized suggestions',
          source: 'InfilloAI',
          confidence: 0,
          fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
          fieldName: fieldInfo.name
        });
      }

      return {
        suggestions: allSuggestions,
        currentIndex: 0,
        fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
        fieldName: fieldInfo.name
      };

    } catch (error) {
      console.error('SuggestionPopup: Complete API failure:', error);
      
      // Check if this is an authentication error
      const isAuthError = this.isAuthenticationError(error);
      
      if (isAuthError) {
        // Get the actual error message for display
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          suggestions: [{
            value: errorMessage.includes('401') 
              ? 'Session expired (401) - please sign in again'
              : 'Authentication required - please sign in',
            source: 'Authentication Required',
            confidence: 0,
            fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
            fieldName: fieldInfo.name
          }],
          currentIndex: 0,
          fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
          fieldName: fieldInfo.name,
          error: errorMessage
        };
      }
      
      // For other errors, return fallback suggestions
      const fallbackSuggestions = this.getFallbackSuggestions(fieldInfo);
      
      if (fallbackSuggestions.length === 0) {
        fallbackSuggestions.push({
          value: 'Unable to load suggestions',
          source: 'Error',
          confidence: 0,
          fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
          fieldName: fieldInfo.name
        });
      }

      return {
        suggestions: fallbackSuggestions,
        currentIndex: 0,
        fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
        fieldName: fieldInfo.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }



  /**
   * Check if an error is an authentication error (401, token expired, etc.)
   */
  private isAuthenticationError(error: unknown): boolean {
    if (!error) return false;
    
    // Check for HTTP status codes
    if ((typeof error === 'object' && error !== null && 'status' in error && (error as any).status === 401) ||
        (typeof error === 'object' && error !== null && 'statusCode' in error && (error as any).statusCode === 401)) {
      return true;
    }
    
    // Check for error messages
    const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
    const authErrorKeywords = [
      'unauthorized',
      'authentication',
      'token',
      'expired',
      'invalid',
      'access denied',
      '401',
      'refresh',
      'login',
      'signin'
    ];
    
    return authErrorKeywords.some(keyword => errorMessage.includes(keyword));
  }







  /**
   * Convert field type to human-readable format
   */
  private humanizeFieldType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'text': 'Text',
      'email': 'Email',
      'tel': 'Phone',
      'url': 'Website',
      'password': 'Password',
      'search': 'Search',
      'number': 'Number',
      'date': 'Date',
      'time': 'Time',
      'textarea': 'Text Area'
    };
    
    return typeMap[fieldType] || 'Text Field';
  }

  /**
   * Get fallback suggestions when API is unavailable
   */
  private getFallbackSuggestions(fieldInfo: {
    type: string;
    name: string;
    label: string;
  }): SuggestionData[] {
    const suggestions: SuggestionData[] = [];
    const fieldContext = `${fieldInfo.name} ${fieldInfo.label}`.toLowerCase();
    const fieldType = fieldInfo.label || this.humanizeFieldType(fieldInfo.type);

    // For privacy and to avoid hardcoded data, we provide generic format hints
    // instead of specific examples
    
    if (fieldInfo.type === 'email' || fieldContext.includes('email')) {
      suggestions.push({
        value: `Enter your email address`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldInfo.type === 'tel' || fieldContext.includes('phone') || fieldContext.includes('tel')) {
      suggestions.push({
        value: `Enter your phone number`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('name')) {
      suggestions.push({
        value: `Enter your ${fieldContext.includes('first') ? 'first name' : 
                             fieldContext.includes('last') ? 'last name' : 'name'}`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('address')) {
      suggestions.push({
        value: `Enter your ${fieldContext.includes('street') ? 'street address' : 'address'}`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('city')) {
      suggestions.push({
        value: `Enter your city`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('state') || fieldContext.includes('province') || fieldContext.includes('region')) {
      suggestions.push({
        value: `Enter your state/province`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('zip') || fieldContext.includes('postal') || fieldContext.includes('postcode')) {
      suggestions.push({
        value: `Enter your postal code`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else if (fieldContext.includes('company') || fieldContext.includes('organization') || fieldContext.includes('employer')) {
      suggestions.push({
        value: `Enter your company name`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    } else {
      // Generic fallback for any unrecognized field
      suggestions.push({
        value: `Enter ${fieldType.toLowerCase()}`,
        source: 'Field Help',
        confidence: 0,
        fieldType: fieldType,
        fieldName: fieldInfo.name
      });
    }

    return suggestions;
  }

  /**
   * Navigate to previous suggestion
   */
  private navigateToPrevious(): void {
    if (!this.currentSuggestions || this.currentSuggestions.suggestions.length <= 1) return;
    
    this.currentSuggestions.currentIndex = 
      (this.currentSuggestions.currentIndex - 1 + this.currentSuggestions.suggestions.length) % this.currentSuggestions.suggestions.length;
    
    this.updateCurrentSuggestionDisplay();
  }

  /**
   * Navigate to next suggestion
   */
  private navigateToNext(): void {
    if (!this.currentSuggestions || this.currentSuggestions.suggestions.length <= 1) return;
    
    this.currentSuggestions.currentIndex = 
      (this.currentSuggestions.currentIndex + 1) % this.currentSuggestions.suggestions.length;
    
    this.updateCurrentSuggestionDisplay();
  }

  /**
   * Update the displayed suggestion without recreating the popup
   */
  private updateCurrentSuggestionDisplay(): void {
    if (!this.popup || !this.currentSuggestions) return;

    const shadowRoot = this.popup.shadowRoot;
    if (!shadowRoot) return;

    const currentSuggestion = this.currentSuggestions.suggestions[this.currentSuggestions.currentIndex];
    if (!currentSuggestion) return;
    
    // Update suggestion value with smart truncation
    const valueContainer = shadowRoot.querySelector('.suggestion-value-container');
    const valueElement = shadowRoot.querySelector('.suggestion-value');
    if (valueElement && valueContainer) {
      const suggestionText = currentSuggestion.value;
      const needsTruncation = suggestionText.length > 150 || suggestionText.split('\n').length > 3;
      
      // Update the text content
      valueElement.textContent = suggestionText;
      valueElement.setAttribute('data-full-text', suggestionText);
      
      // Reset classes and apply appropriate truncation
      valueElement.className = needsTruncation ? 'suggestion-value truncated' : 'suggestion-value';
      
      // Handle expand toggle
      let expandToggle = shadowRoot.querySelector('.expand-toggle');
      if (needsTruncation && !expandToggle) {
        // Create expand toggle if it doesn't exist
        const toggleElement = document.createElement('div');
        toggleElement.className = 'expand-toggle';
        toggleElement.setAttribute('data-action', 'toggle-expand');
        toggleElement.innerHTML = `
          <span class="icon">▼</span>
          <span class="text">Show more</span>
        `;
        valueContainer.appendChild(toggleElement);
      } else if (!needsTruncation && expandToggle) {
        // Remove expand toggle if not needed
        expandToggle.remove();
      } else if (expandToggle) {
        // Reset expand toggle state
        expandToggle.className = 'expand-toggle';
        const toggleText = expandToggle.querySelector('.text') as HTMLElement;
        const toggleIcon = expandToggle.querySelector('.icon') as HTMLElement;
        if (toggleText) toggleText.textContent = 'Show more';
        if (toggleIcon) toggleIcon.textContent = '▼';
      }
    }

    // Update source info
    const sourceElement = shadowRoot.querySelector('.suggestion-source-text');
    if (sourceElement) {
      sourceElement.textContent = `from: ${currentSuggestion.source}`;
    }

    // Update confidence bar
    const confidenceFill = shadowRoot.querySelector('.confidence-fill') as HTMLElement;
    if (confidenceFill) {
      confidenceFill.style.width = `${currentSuggestion.confidence}%`;
    }

    // Update confidence text
    const confidenceText = shadowRoot.querySelector('.confidence-text');
    if (confidenceText) {
      confidenceText.textContent = `${currentSuggestion.confidence}% match`;
    }

    // Update navigation counter
    const navCounter = shadowRoot.querySelector('.nav-counter');
    if (navCounter) {
      navCounter.textContent = `${this.currentSuggestions.currentIndex + 1} of ${this.currentSuggestions.suggestions.length}`;
    }

    // Update navigation button states
    this.updateNavigationButtons();
  }

  /**
   * Update navigation button states
   */
  private updateNavigationButtons(): void {
    if (!this.popup || !this.currentSuggestions) return;

    const shadowRoot = this.popup.shadowRoot;
    if (!shadowRoot) return;

    const prevButton = shadowRoot.querySelector('.nav-prev') as HTMLButtonElement;
    const nextButton = shadowRoot.querySelector('.nav-next') as HTMLButtonElement;

    if (prevButton && nextButton) {
      const hasMultiple = this.currentSuggestions.suggestions.length > 1;
      prevButton.style.display = hasMultiple ? 'flex' : 'none';
      nextButton.style.display = hasMultiple ? 'flex' : 'none';
    }
  }

  /**
   * Handle expand/collapse toggle for long suggestions
   */
  private handleExpandToggle(): void {
    if (!this.popup) return;

    const shadowRoot = this.popup.shadowRoot;
    if (!shadowRoot) return;

    const suggestionValue = shadowRoot.querySelector('.suggestion-value') as HTMLElement;
    const expandToggle = shadowRoot.querySelector('.expand-toggle') as HTMLElement;
    const toggleText = expandToggle.querySelector('.text') as HTMLElement;
    const toggleIcon = expandToggle.querySelector('.icon') as HTMLElement;

    if (!suggestionValue || !expandToggle || !toggleText || !toggleIcon) return;

    const isCurrentlyTruncated = suggestionValue.classList.contains('truncated');

    if (isCurrentlyTruncated) {
      // Expand the content
      suggestionValue.classList.remove('truncated');
      suggestionValue.classList.add('expanded');
      expandToggle.classList.add('expanded');
      toggleText.textContent = 'Show less';
      toggleIcon.textContent = '▲';
      
      // Smooth height transition
      suggestionValue.style.transition = 'max-height 0.3s ease-out';
      
    } else {
      // Collapse the content
      suggestionValue.classList.remove('expanded');
      suggestionValue.classList.add('truncated');
      expandToggle.classList.remove('expanded');
      toggleText.textContent = 'Show more';
      toggleIcon.textContent = '▼';
      
      // Smooth height transition
      suggestionValue.style.transition = 'max-height 0.3s ease-out';
    }

    console.log('SuggestionPopup: Toggled suggestion expansion:', !isCurrentlyTruncated ? 'collapsed' : 'expanded');
  }

  /**
   * Hide popup
   */
  hide(): void {
    if (this.popup) {
      document.body.removeChild(this.popup);
      this.popup = null;
    }
    
    this.field = null;
    this.onAccept = undefined;
    this.onReject = undefined;
    this.currentSuggestions = null;
    this.formId = undefined; // Clear formId when hiding popup
    
    // Remove outside click listener
    document.removeEventListener('click', this.handleOutsideClick.bind(this), true);
  }
  /**
   * Create popup element for multiple suggestions
   */
  private createMultipleSuggestionsPopup(suggestionsData: MultipleSuggestionsData, _onRefine?: (context: { contextText?: string; customPrompt?: string; documentIds?: string[] }) => Promise<any[]>): HTMLElement {
    console.log('SuggestionPopup: createMultipleSuggestionsPopup() called with:', suggestionsData);
    
    const currentSuggestion = suggestionsData.suggestions[suggestionsData.currentIndex];
    if (!currentSuggestion) {
      throw new Error('No current suggestion available');
    }
    const hasMultiple = suggestionsData.suggestions.length > 1;
    
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483648 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }

      .suggestion-popup {
        background: white !important;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border: 1px solid #E2E8F0;
        padding: 16px;
        width: 350px;
        pointer-events: all;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
        transition: all 0.2s ease;
        position: relative;
        display: block !important;
        visibility: visible !important;
      }

      .suggestion-popup * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .suggestion-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 8px;
        gap: 12px;
      }

      .suggestion-value-container {
        flex: 1;
        min-width: 0; /* Allow text to shrink */
      }

      .suggestion-value {
        font-size: 18px;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
        line-height: 1.4;
        flex: 1;
        transition: all 0.3s ease;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
      }

      .suggestion-value.scrollable {
        max-height: 120px;
        overflow-y: auto;
        padding-right: 8px;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f8fafc;
        border-radius: 8px;
        background: #fafbfc;
        border: 1px solid #e2e8f0;
        padding: 12px;
        margin: 4px 0;
        transition: all 0.2s ease;
      }

      .suggestion-value.scrollable:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
      }

      .suggestion-value.scrollable::-webkit-scrollbar {
        width: 6px;
      }

      .suggestion-value.scrollable::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }

      .suggestion-value.scrollable::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
        transition: background 0.2s ease;
      }

      .suggestion-value.scrollable::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      /* Subtle scroll indicator */
      .suggestion-value.scrollable::after {
        content: '';
        position: absolute;
        right: 12px;
        top: 12px;
        width: 4px;
        height: 4px;
        background: #cbd5e1;
        border-radius: 50%;
        opacity: 0.6;
        animation: scrollHint 2s ease-in-out infinite;
      }

      @keyframes scrollHint {
        0%, 100% { opacity: 0.3; transform: translateY(0); }
        50% { opacity: 0.8; transform: translateY(2px); }
      }

      .scroll-indicator {
        font-size: 12px;
        color: #6b7280;
        text-align: center;
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        opacity: 0.7;
        animation: fadeInOut 3s ease-in-out;
      }

      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        20%, 80% { opacity: 0.7; }
      }

      /* Responsive improvements for different content lengths */
      @media (max-width: 480px) {
        .suggestion-popup {
          width: 320px;
          margin: 0 16px;
        }
        
        .suggestion-value {
          font-size: 16px;
        }
        
        .suggestion-value.truncated {
          -webkit-line-clamp: 2;
          max-height: 2.8em; /* 2 lines × 1.4 line-height */
        }
        
        .expand-toggle {
          font-size: 13px;
        }
      }

      /* Enhanced styling for very long content */
      .suggestion-value.long-content {
        font-size: 16px;
        line-height: 1.5;
        padding: 8px 0;
      }

      .suggestion-value.long-content.expanded {
        max-height: 300px;
        padding: 12px;
        background: #fafbfc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin: 4px 0;
      }

      /* Improved readability for different content types */
      .suggestion-value.multiline {
        white-space: pre-wrap;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 14px;
        background: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }

      .nav-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 12px;
      }

      .nav-button {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        color: #64748b;
      }

      .nav-button:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }

      .nav-button:active {
        transform: scale(0.95);
      }

      .nav-counter {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
        min-width: 50px;
        text-align: center;
      }

      .suggestion-source {
        font-size: 12px;
        color: #64748b;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .source-arrow {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin: 0 6px;
        background-image: url('data:image/svg+xml;utf8,<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13M13 8L9.25 4M13 8L9.25 12" stroke="%2362748E" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        vertical-align: middle;
      }

      .confidence-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 20px 0;
      }

      .confidence-bar {
        flex: 1;
        height: 4px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .confidence-fill {
        height: 100%;
        background: #22c55e;
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .confidence-text {
        font-size: 12px;
        font-weight: 600;
        color: #22c55e;
        white-space: nowrap;
      }

      .actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .btn {
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .btn-accept {
        background: #22c55e;
        color: white;
        padding: 10px 16px;
        font-weight: 600;
      }

      .btn-accept:hover {
        background: #16a34a;
      }

      .btn-reject {
        background: #f1f5f9;
        color: #475569;
        padding: 10px 16px;
        font-weight: 500;
      }

      .btn-reject:hover {
        background: #e2e8f0;
        color: #334155;
      }

      .btn-icon {
        background: #f8fafc;
        color: #64748b;
        padding: 8px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
      }

      .btn-icon:hover {
        background: #f1f5f9;
        color: #475569;
      }

      /* Icon styling for accept/reject buttons */
      .icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 6px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .source-arrow {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin: 0 6px;
        background-image: url('data:image/svg+xml;utf8,<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13M13 8L9.25 4M13 8L9.25 12" stroke="%2362748E" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        vertical-align: middle;
      }

      .icon-checkmark {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 11.3551L6.33849 12.7898C7.07661 13.581 7.44568 13.9766 7.85928 14.1015C8.22254 14.2112 8.60872 14.1818 8.95491 14.018C9.34907 13.8316 9.66545 13.3838 10.2982 12.4882L15 5.83333" stroke="%23F8FAFC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      }

      .icon-cross {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 5.00004L5 15M4.99996 5L14.9999 15" stroke="%230F172B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      }

      /* Edit and Info icons with direct background-image */
      .btn-icon-edit {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.94407 9.29153C7.65972 9.57626 7.5 9.96223 7.5 10.3647V12.5H9.6484C10.0512 12.5 10.4375 12.3399 10.7223 12.055L17.0555 5.7181C17.6482 5.12512 17.6482 4.16399 17.0555 3.57101L16.4299 2.94501C15.8367 2.3515 14.8747 2.35169 14.2817 2.94542L7.94407 9.29153Z" stroke="%2362748E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 10C17.5 13.5355 17.5 15.3033 16.4016 16.4016C15.3033 17.5 13.5355 17.5 10 17.5C6.46447 17.5 4.6967 17.5 3.59835 16.4016C2.5 15.3033 2.5 13.5355 2.5 10C2.5 6.46447 2.5 4.6967 3.59835 3.59835C4.6967 2.5 6.46447 2.5 10 2.5" stroke="%2362748E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: 20px 20px;
        background-repeat: no-repeat;
        background-position: center;
      }

      .btn-icon-info {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.99998 13.3333V9.16666H9.58331M9.58331 13.3333H10.4166" stroke="%2362748E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 7.08334V6.66667" stroke="%2362748E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="7.5" stroke="%2362748E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: 20px 20px;
        background-repeat: no-repeat;
        background-position: center;
      }

      /* Loading and state styles */
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e2e8f0;
        border-top: 2px solid #4f46e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-progress {
        margin: 12px 0;
      }

      .progress-bar {
        width: 100%;
        height: 4px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: #4f46e5;
        border-radius: 4px;
        animation: progress 2s ease-in-out infinite;
      }

      @keyframes progress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }

      .suggestion-value.error {
        color: #ef4444;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .suggestion-value.no-suggestions {
        font-size: 14px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .suggestion-value.loading {
        font-size: 14px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .error-icon,
      .info-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
    `;

    console.log('SuggestionPopup: Creating isolated container...');
    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-suggestion-${Date.now()}`,
      styles: styles
    });
    console.log('SuggestionPopup: Isolated container created:', { container, shadowRoot });

    const popupElement = document.createElement('div');
    popupElement.className = 'suggestion-popup';
    console.log('SuggestionPopup: Popup element created:', popupElement);

    // Handle different states
    if (suggestionsData.isLoading) {
      popupElement.innerHTML = `
        <div class="suggestion-value loading">
          <div class="loading-spinner"></div>
          Loading suggestions...
        </div>
        <div class="suggestion-source">
          <span>Fetching suggestions from InfilloAI...</span>
        </div>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      `;
    } else if (suggestionsData.error) {
      popupElement.innerHTML = `
        <div class="suggestion-value error">
          <span class="error-icon">⚠️</span>
          ${this.escapeHtml(currentSuggestion.value)}
        </div>
        <div class="suggestion-source">
          <span>Error: ${this.escapeHtml(suggestionsData.error)}</span>
        </div>
        <div class="actions">
          <button class="btn btn-reject" data-action="reject">
            <span class="icon icon-cross"></span>
            Close
          </button>
        </div>
      `;
    } else if (currentSuggestion.confidence === 0) {
      const isAuthError = currentSuggestion.source === 'Authentication Required' || 
                          currentSuggestion.value.includes('sign in') ||
                          currentSuggestion.value.includes('401') ||
                          currentSuggestion.value.includes('expired');
      
      const isFieldHelp = currentSuggestion.source === 'Field Help';
      
      popupElement.innerHTML = `
        <div class="suggestion-value no-suggestions">
          <span class="info-icon">${isAuthError ? '🔐' : 'ℹ️'}</span>
          ${this.escapeHtml(currentSuggestion.value)}
        </div>
        <div class="suggestion-source">
          <span>${isAuthError ? 
            'Click the extension icon or use the Sign In button below' : 
            isFieldHelp ? 
              'Try uploading documents or adding personal information to get better suggestions' :
              'Check your connection and try again'
          }</span>
        </div>
        <div class="actions">
          ${isAuthError ? `
            <button class="btn btn-accept" data-action="signin">
              <span>🚀</span>
              Sign In
            </button>
          ` : ''}
          <button class="btn btn-reject" data-action="reject">
            <span class="icon icon-cross"></span>
            Close
          </button>
        </div>
      `;
    } else {
            // Smart scrolling logic - determine if content needs scrolling
      const suggestionText = currentSuggestion.value;
      const isMultiline = suggestionText.includes('\n');
      const isLongContent = suggestionText.length > 200; // Lowered threshold for scroll
      const needsScrolling = suggestionText.length > 150 || suggestionText.split('\n').length > 4;
      
      // Build CSS classes for content type
      let cssClasses = 'suggestion-value';
      if (needsScrolling) cssClasses += ' scrollable';
      if (isLongContent) cssClasses += ' long-content';
      if (isMultiline) cssClasses += ' multiline';
      
      popupElement.innerHTML = `
        <div class="suggestion-header">
          <div class="suggestion-value-container">
            <div class="${cssClasses}" data-full-text="${this.escapeHtml(suggestionText)}">${this.escapeHtml(suggestionText)}</div>
            ${needsScrolling ? `
              <div class="scroll-indicator">
                <span>📜</span>
                <span>Scroll to see more</span>
              </div>
            ` : ''}
          </div>
          <div class="nav-controls" style="display: ${hasMultiple ? 'flex' : 'none'}">
            <button class="nav-button nav-prev" data-action="prev" title="Previous suggestion">‹</button>
            <div class="nav-counter">${suggestionsData.currentIndex + 1} of ${suggestionsData.suggestions.length}</div>
            <button class="nav-button nav-next" data-action="next" title="Next suggestion">›</button>
          </div>
        </div>
        <div class="suggestion-source">
          <span class="suggestion-source-text">from: ${this.escapeHtml(currentSuggestion.source)}</span>
          <span class="source-arrow"></span>
          <span>${this.escapeHtml(currentSuggestion.fieldType)}</span>
        </div>
        <div class="confidence-container">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${currentSuggestion.confidence}%"></div>
          </div>
          <div class="confidence-text">${currentSuggestion.confidence}% match</div>
        </div>
        <div class="actions">
          <button class="btn btn-accept" data-action="accept">
            <span class="icon icon-checkmark"></span>
            Accept
          </button>
          <button class="btn btn-reject" data-action="reject">
            <span class="icon icon-cross"></span>
            Reject
          </button>
          ${this.formId ? `
            <button class="btn btn-icon btn-icon-edit" data-action="edit" title="Edit">
            </button>
          ` : ''}
          <button class="btn btn-icon btn-icon-info" data-action="info" title="More info">
          </button>
        </div>
      `;
    }

    // Add event listeners
    this.attachMultipleSuggestionsEventListeners(popupElement, suggestionsData, _onRefine);
    console.log('SuggestionPopup: Event listeners attached');

    shadowRoot.appendChild(popupElement);
    console.log('SuggestionPopup: Popup element appended to shadow root');

    return container;
  }

  /**
   * Create popup element (legacy method for backward compatibility)
   */
  private createPopup(suggestion: SuggestionData): HTMLElement {
    console.log('SuggestionPopup: createPopup() called with suggestion:', suggestion);
    
    // Get confidence color for consistent theming
    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 80) return '#22c55e';
      if (confidence >= 60) return '#f59e0b';
      if (confidence >= 40) return '#eab308';
      return '#ef4444';
    };

    const getConfidenceGradient = (confidence: number): string => {
      if (confidence >= 80) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
      if (confidence >= 60) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      if (confidence >= 40) return 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    };
    
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483648 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }

      .suggestion-popup {
        background: white !important;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8);
        border: none;
        padding: 0;
        width: 380px;
        pointer-events: all;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: block !important;
        visibility: visible !important;
        overflow: hidden;
        backdrop-filter: blur(20px);
        animation: modernPopupSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes modernPopupSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .suggestion-popup * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      /* Modern gradient header */
      .suggestion-header {
        background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%);
        padding: 24px 24px 20px;
        color: white;
        position: relative;
        overflow: hidden;
      }

      .suggestion-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 2px, transparent 2px);
        background-size: 20px 20px;
        opacity: 0.4;
      }

      .header-content {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .suggestion-icon {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
      }

      .header-text {
        flex: 1;
      }

      .suggestion-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        opacity: 0.9;
        margin: 0 0 4px 0;
      }

      .suggestion-value {
        font-size: 20px;
        font-weight: 700;
        color: white;
        margin: 0;
        line-height: 1.3;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        word-break: break-word;
      }

      /* Content section */
      .suggestion-content {
        padding: 24px;
        background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
      }

      .suggestion-source {
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 20px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
      }

      .source-icon {
        font-size: 16px;
      }

      .source-arrow {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin: 0 8px;
        background-image: url('data:image/svg+xml;utf8,<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8H13M13 8L9.25 4M13 8L9.25 12" stroke="%236b7280" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        vertical-align: middle;
      }

      .confidence-section {
        margin: 0 0 24px 0;
      }

      .confidence-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .confidence-label {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .confidence-value {
        font-size: 14px;
        font-weight: 700;
        color: ${getConfidenceColor(suggestion.confidence)};
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .confidence-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${getConfidenceColor(suggestion.confidence)};
        animation: confidencePulse 2s infinite;
      }

      @keyframes confidencePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .confidence-container {
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 16px;
        border: 2px solid ${getConfidenceColor(suggestion.confidence)}20;
      }

      .confidence-bar {
        width: 100%;
        height: 8px;
        background: #f1f5f9;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
      }

      .confidence-fill {
        height: 100%;
        background: ${getConfidenceGradient(suggestion.confidence)};
        border-radius: 8px;
        transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        width: ${suggestion.confidence}%;
        position: relative;
        overflow: hidden;
      }

      .confidence-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: confidenceShimmer 2s infinite;
      }

      @keyframes confidenceShimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .confidence-description {
        font-size: 12px;
        color: #6b7280;
        margin-top: 8px;
        text-align: center;
      }

      .actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .btn {
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        position: relative;
        overflow: hidden;
      }

      .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }

      .btn:hover::before {
        left: 100%;
      }

      .btn-accept {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        padding: 14px 20px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        flex: 1;
      }

      .btn-accept:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
      }

      .btn-accept:active {
        transform: translateY(0);
      }

      .btn-reject {
        background: white;
        color: #475569;
        padding: 14px 20px;
        font-weight: 600;
        border: 2px solid #e2e8f0;
        flex: 1;
      }

      .btn-reject:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #334155;
        transform: translateY(-1px);
      }

      .btn-icon {
        background: white;
        color: #6b7280;
        padding: 12px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 2px solid #e5e7eb;
        transition: all 0.2s ease;
      }

      .btn-icon:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        color: #374151;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      /* Icon styling for accept/reject buttons */
      .icon {
        display: inline-block;
        width: 18px;
        height: 18px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .icon-checkmark {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 11.3551L6.33849 12.7898C7.07661 13.581 7.44568 13.9766 7.85928 14.1015C8.22254 14.2112 8.60872 14.1818 8.95491 14.018C9.34907 13.8316 9.66545 13.3838 10.2982 12.4882L15 5.83333" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      }

      .icon-cross {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 5.00004L5 15M4.99996 5L14.9999 15" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      }

      /* Edit and Info icons with modern styling */
      .btn-icon-edit {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.94407 9.29153C7.65972 9.57626 7.5 9.96223 7.5 10.3647V12.5H9.6484C10.0512 12.5 10.4375 12.3399 10.7223 12.055L17.0555 5.7181C17.6482 5.12512 17.6482 4.16399 17.0555 3.57101L16.4299 2.94501C15.8367 2.3515 14.8747 2.35169 14.2817 2.94542L7.94407 9.29153Z" stroke="%236b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 10C17.5 13.5355 17.5 15.3033 16.4016 16.4016C15.3033 17.5 13.5355 17.5 10 17.5C6.46447 17.5 4.6967 17.5 3.59835 16.4016C2.5 15.3033 2.5 13.5355 2.5 10C2.5 6.46447 2.5 4.6967 3.59835 3.59835C4.6967 2.5 6.46447 2.5 10 2.5" stroke="%236b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: 20px 20px;
        background-repeat: no-repeat;
        background-position: center;
      }

      .btn-icon-info {
        background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.99998 13.3333V9.16666H9.58331M9.58331 13.3333H10.4166" stroke="%236b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 7.08334V6.66667" stroke="%236b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="7.5" stroke="%236b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        background-size: 20px 20px;
        background-repeat: no-repeat;
        background-position: center;
      }

      /* Loading and state styles */
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff40;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-state {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 12px;
        margin: 16px 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      /* Enhanced responsiveness */
      @media (max-width: 480px) {
        .suggestion-popup {
          width: 340px;
        }
        
        .suggestion-value {
          font-size: 18px;
        }
        
        .actions {
          flex-direction: column;
          gap: 8px;
        }
        
        .btn-accept, .btn-reject {
          width: 100%;
        }
      }

      /* Dark mode support (future enhancement) */
      @media (prefers-color-scheme: dark) {
        .suggestion-popup {
          background: #1f2937 !important;
          color: #f9fafb;
        }
        
        .suggestion-content {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        }
        
        .suggestion-source {
          background: #374151;
          border-color: #4b5563;
          color: #d1d5db;
        }
        
        .confidence-container {
          background: #374151;
        }
      }
    `;

    const popupElement = document.createElement('div');
    popupElement.className = 'suggestion-popup';
    
    // Get confidence description
    const getConfidenceDescription = (confidence: number): string => {
      if (confidence >= 90) return 'Excellent match - high confidence';
      if (confidence >= 80) return 'Very good match - reliable suggestion';
      if (confidence >= 60) return 'Good match - likely relevant';
      if (confidence >= 40) return 'Fair match - might be useful';
      return 'Low match - use with caution';
    };

    popupElement.innerHTML = `
      <style>${styles}</style>
      
      <!-- Modern gradient header -->
      <div class="suggestion-header">
        <div class="header-content">
          <div class="suggestion-icon">
            ✨
          </div>
          <div class="header-text">
            <div class="suggestion-label">AI Suggestion</div>
            <div class="suggestion-value">${this.escapeHtml(suggestion.value)}</div>
          </div>
        </div>
      </div>

      <!-- Content section -->
      <div class="suggestion-content">
        <div class="suggestion-source">
          <span class="source-icon">📍</span>
          <span>from</span>
          <span class="source-arrow"></span>
          <span style="font-weight: 600; color: #374151;">${this.escapeHtml(suggestion.source)}</span>
        </div>

        <div class="confidence-section">
          <div class="confidence-header">
            <div class="confidence-label">
              <span style="font-size: 16px;">🎯</span>
              Confidence Score
            </div>
            <div class="confidence-value">
              <div class="confidence-dot"></div>
              ${suggestion.confidence}%
            </div>
          </div>
          
          <div class="confidence-container">
            <div class="confidence-bar">
              <div class="confidence-fill"></div>
            </div>
            <div class="confidence-description">
              ${getConfidenceDescription(suggestion.confidence)}
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-accept" data-action="accept">
            <span class="icon icon-checkmark"></span>
            Accept
          </button>
          <button class="btn btn-reject" data-action="reject">
            <span class="icon icon-cross"></span>
            Decline
          </button>
          ${this.formId ? `
            <button class="btn btn-icon btn-icon-edit" data-action="edit" title="Enhance suggestion"></button>
          ` : ''}
          <button class="btn btn-icon btn-icon-info" data-action="info" title="More info"></button>
        </div>
      </div>
    `;

    // Add event listeners - CRITICAL!
    this.attachEventListeners(popupElement, suggestion);
    console.log('SuggestionPopup: Event listeners attached');

    // Use CSS isolation container for proper styling
    console.log('SuggestionPopup: Creating isolated container...');
    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-suggestion-${Date.now()}`,
      styles: styles
    });
    console.log('SuggestionPopup: Isolated container created:', { container, shadowRoot });

    shadowRoot.appendChild(popupElement);
    console.log('SuggestionPopup: Popup element appended to shadow root');

    return container;
  }

  // Configuration constants
  private static readonly POPUP_CONFIG = {
    width: 350,
    estimatedHeight: 180,
    gapFromField: 12,
    screenMargin: 16
  };



  /**
   * Position popup relative to field
   */
  private positionPopup(field: HTMLElement): void {
    if (!this.popup) return;

    const rect = field.getBoundingClientRect();
    const { width: popupWidth, estimatedHeight: popupHeight, gapFromField, screenMargin } = SuggestionPopup.POPUP_CONFIG;
    
    // Position directly below the input field
    let left = rect.left;
    let top = rect.bottom + gapFromField;
    
    // Adjust horizontal position if popup would go off screen
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - screenMargin;
    }
    
    // Adjust vertical position if popup would go off screen
    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - gapFromField; // Show above if no space below
    }
    
    // Ensure popup doesn't go off left edge
    left = Math.max(screenMargin, left);
    
    console.log('SuggestionPopup: Positioning at:', { left, top, fieldRect: rect });
    
    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
  }
  


  /**
   * Attach event listeners for multiple suggestions popup
   */
  private attachMultipleSuggestionsEventListeners(
    popupElement: HTMLElement, 
    suggestionsData: MultipleSuggestionsData,
    onRefine?: (context: { contextText?: string; customPrompt?: string; documentIds?: string[] }) => Promise<any[]>
  ): void {
    popupElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement;
      
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      const currentSuggestion = suggestionsData.suggestions[suggestionsData.currentIndex];
      
      console.log('SuggestionPopup: Button clicked with action:', action);
      
      if (!currentSuggestion) return;
      
      switch (action) {
        case 'accept':
          this.handleAccept(currentSuggestion.value);
          break;
        case 'reject':
          this.handleReject();
          break;
        case 'edit':
          if (onRefine) {
            this.showRefineModal(onRefine);
          } else {
            this.handleEdit(currentSuggestion);
          }
          break;
        case 'info':
          this.handleInfo(currentSuggestion);
          break;
        case 'signin':
          this.handleSignIn();
          break;
        case 'prev':
          this.navigateToPrevious();
          break;
        case 'next':
          this.navigateToNext();
          break;
        case 'toggle-expand':
          console.log('SuggestionPopup: Toggle expand clicked');
          this.handleExpandToggle();
          break;
      }
    });

    // Close popup when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this), true);
  }

  /**
   * Attach event listeners to popup actions (legacy method)
   */
  private attachEventListeners(popupElement: HTMLElement, suggestion: SuggestionData): void {
    popupElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement;
      
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      
      switch (action) {
        case 'accept':
          this.handleAccept(suggestion.value);
          break;
        case 'reject':
          this.handleReject();
          break;
        case 'edit':
          this.handleEdit(suggestion);
          break;
        case 'info':
          this.handleInfo(suggestion);
          break;
        case 'signin':
          this.handleSignIn();
          break;
      }
    });

    // Close popup when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this), true);
  }

  /**
   * Handle accept action
   */
  private async handleAccept(value: string): Promise<void> {
    console.log('SuggestionPopup: handleAccept called with:', { value, field: this.field });
    
    if (this.field && (this.field instanceof HTMLInputElement || 
                       this.field instanceof HTMLTextAreaElement || 
                       this.field instanceof HTMLSelectElement)) {
      
      console.log('SuggestionPopup: Setting field value to:', value);
      this.field.value = value;
      
      // Dispatch events to notify the page of the change
      this.field.dispatchEvent(new Event('input', { bubbles: true }));
      this.field.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('SuggestionPopup: Field populated and events dispatched');
    } else {
      console.warn('SuggestionPopup: Field is not a valid form element:', this.field);
    }
    
    if (this.onAccept) {
      this.onAccept(value);
    }
    
    this.hide();
  }

  /**
   * Handle reject action
   */
  private handleReject(): void {
    if (this.onReject) {
      this.onReject();
    }
    
    this.hide();
  }

  /**
   * Handle sign in action
   */
  private handleSignIn(): void {
    console.log('🚀 SuggestionPopup: Sign in button clicked - attempting to open extension');
    
    // Strategy 1: Send message to background script to open popup
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP_FOR_AUTH',
      source: 'suggestion_popup'
    }).then(() => {
      console.log('✅ SuggestionPopup: Successfully requested authentication popup');
    }).catch((error) => {
      console.error('❌ SuggestionPopup: Failed to request authentication popup:', error);
      
      // Strategy 2: Try to open extension popup directly (Chrome 99+)
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().then(() => {
          console.log('✅ SuggestionPopup: Opened extension popup directly');
        }).catch((directError) => {
          console.error('❌ SuggestionPopup: Failed to open popup directly:', directError);
          this.showSignInFallback();
        });
      } else {
        this.showSignInFallback();
      }
    });
    
    this.hide();
  }

  /**
   * Show enhanced sign-in fallback instructions
   */
  private showSignInFallback(): void {
    // Create a styled modal instead of a basic alert
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 2147483650 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
      padding: 0 !important;
      width: 90% !important;
      max-width: 420px !important;
      position: relative !important;
    `;

    modal.innerHTML = `
      <div style="padding: 32px 24px 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #0f172a;">
          Sign In Required
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
          To get personalized suggestions, please sign in to InfilloAI. Click the extension icon in your browser toolbar.
        </p>
        
        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
        ">
          <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 12px;">
            📍 How to find the extension:
          </div>
          <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.4;">
            <li style="margin-bottom: 6px;">Look for the InfilloAI icon (🤖) in your browser toolbar</li>
            <li style="margin-bottom: 6px;">If not visible, click the puzzle piece icon (⚙️) to see all extensions</li>
            <li>Click the InfilloAI icon to open the sign-in page</li>
          </ol>
        </div>
      </div>

      <div style="
        padding: 16px 24px 24px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: center;
      ">
        <button id="close-signin-modal" style="
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
        ">Got It</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    const closeBtn = modal.querySelector('#close-signin-modal') as HTMLButtonElement;
    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });

    // Auto-close after 10 seconds
    setTimeout(cleanup, 10000);

    console.log('📋 SuggestionPopup: Showed sign-in fallback instructions');
  }

  /**
   * Handle edit action
   */
  private async handleEdit(suggestion: SuggestionData): Promise<void> {
    console.log('🎯 SuggestionPopup: Edit button clicked! suggestion:', suggestion);
    
    // Hide suggestion popup temporarily
    if (this.popup) {
      this.popup.style.display = 'none';
    }
    
    // Create simple modal overlay
    this.showSimpleContextModal(suggestion);
  }

  /**
   * Show beautiful enhance suggestion modal with modern design
   */
  private showSimpleContextModal(suggestion: SuggestionData): void {
    // Create overlay with backdrop blur
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 2147483650 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(4px) !important;
    `;

    // Create modal content with modern styling
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white !important;
      border-radius: 20px !important;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
      padding: 0 !important;
      width: 90% !important;
      max-width: 650px !important;
      max-height: 90vh !important;
      overflow: hidden !important;
      position: relative !important;
      animation: enhanceModalSlideIn 0.3s ease-out !important;
    `;

    // Add animation keyframes if not already present
    if (!document.querySelector('#enhance-modal-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'enhance-modal-styles';
      styleSheet.textContent = `
        @keyframes enhanceModalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes enhanceModalSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
        }
        @keyframes enhanceFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Get confidence color for visual consistency
    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 80) return '#22c55e';
      if (confidence >= 60) return '#f59e0b';
      if (confidence >= 40) return '#eab308';
      return '#ef4444';
    };

    modal.innerHTML = `
      <!-- Beautiful Gradient Header -->
      <div style="
        background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%);
        padding: 32px 32px 24px;
        color: white;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated background pattern -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 2px, transparent 2px);
          background-size: 30px 30px;
          opacity: 0.3;
        "></div>
        
        <button id="close-modal" style="
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 1;
        ">×</button>
        
        <div style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1;">
          <div style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            border: 2px solid rgba(255, 255, 255, 0.3);
          ">
            ✨
          </div>
          <div>
            <h2 style="
              margin: 0 0 8px 0;
              font-size: 28px;
              font-weight: 700;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              letter-spacing: -0.5px;
            ">
              Enhance Suggestion
            </h2>
            <p style="
              margin: 0;
              font-size: 16px;
              opacity: 0.9;
              font-weight: 400;
            ">
              Add context or upload documents to get a better suggestion
            </p>
          </div>
        </div>
      </div>

      <!-- Content Section -->
      <div style="padding: 32px; overflow-y: auto; max-height: 500px;">
        
        <!-- Current Suggestion Display -->
        <div style="
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: ${getConfidenceColor(suggestion.confidence)};
          "></div>
          
          <div style="
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 16px;">📝</span>
            Current Suggestion
          </div>
          
          <div style="
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 12px;
            line-height: 1.3;
            word-break: break-word;
          ">
            "${this.escapeHtml(suggestion.value)}"
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: white;
              padding: 8px 16px;
              border-radius: 25px;
              border: 1px solid #e2e8f0;
            ">
              <span style="font-size: 16px;">📍</span>
              <span style="font-size: 14px; font-weight: 500; color: #374151;">
                from: ${this.escapeHtml(suggestion.source)}
              </span>
            </div>
            
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: ${getConfidenceColor(suggestion.confidence)}15;
              padding: 8px 16px;
              border-radius: 25px;
              border: 1px solid ${getConfidenceColor(suggestion.confidence)}30;
            ">
              <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${getConfidenceColor(suggestion.confidence)};
              "></div>
              <span style="
                font-size: 14px;
                font-weight: 600;
                color: ${getConfidenceColor(suggestion.confidence)};
              ">
                ${suggestion.confidence}% match
              </span>
            </div>
          </div>
        </div>

        <!-- Context Input Section -->
        <div style="margin-bottom: 28px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 12px;
          ">
            <span style="font-size: 20px;">💬</span>
            Additional Context
            <span style="
              font-size: 12px;
              font-weight: 400;
              color: #6b7280;
              background: #f3f4f6;
              padding: 2px 8px;
              border-radius: 12px;
            ">optional</span>
          </label>
          
          <div style="position: relative;">
            <textarea 
              id="context-text" 
              placeholder="💡 Examples:&#10;• 'Use my work address instead of home'&#10;• 'This is for a business inquiry'&#10;• 'Make it more formal/casual'&#10;• 'Include my LinkedIn profile'"
              style="
                width: 100%;
                padding: 16px 20px;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 15px;
                font-family: inherit;
                resize: vertical;
                min-height: 140px;
                box-sizing: border-box;
                transition: all 0.2s ease;
                background: #fafbfc;
                line-height: 1.5;
              "
            ></textarea>
            <div style="
              position: absolute;
              bottom: 16px;
              right: 20px;
              font-size: 24px;
              opacity: 0.3;
              pointer-events: none;
            ">✨</div>
          </div>
          
          <div style="
            font-size: 13px;
            color: #6b7280;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-size: 16px;">💡</span>
            The more specific you are, the better AI can tailor the suggestion to your needs.
          </div>
        </div>

        <!-- File Upload Section -->
        <div style="margin-bottom: 28px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 12px;
          ">
            <span style="font-size: 20px;">📄</span>
            Upload Supporting Documents
            <span style="
              font-size: 12px;
              font-weight: 400;
              color: #6b7280;
              background: #f3f4f6;
              padding: 2px 8px;
              border-radius: 12px;
            ">optional</span>
          </label>
          
          <div 
            id="file-upload-area"
            style="
              border: 3px dashed #d1d5db;
              border-radius: 16px;
              padding: 32px 24px;
              text-align: center;
              cursor: pointer;
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            "
          >
            <div style="position: relative; z-index: 1;">
              <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.8;">📄</div>
              <div style="
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
              ">
                Click to upload or drag and drop
              </div>
              <div style="
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 12px;
              ">
                PDF, DOC, DOCX, TXT files up to 10MB
              </div>
              <div style="
                font-size: 12px;
                color: #9ca3af;
                background: white;
                padding: 6px 12px;
                border-radius: 20px;
                display: inline-block;
              ">
                📋 Resumes, cover letters, or reference documents
              </div>
            </div>
          </div>
          <input type="file" id="file-input" multiple accept=".pdf,.doc,.docx,.txt" style="display: none;">
          <div id="uploaded-files" style="margin-top: 16px;"></div>
        </div>

        <!-- Pro Tips Section -->
        <div style="
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #3b82f6;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 8px;
        ">
          <h4 style="
            margin: 0 0 12px 0;
            font-size: 15px;
            font-weight: 600;
            color: #1e40af;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 18px;">💫</span>
            Pro Tips for Better Results
          </h4>
          <ul style="
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #1e40af;
            line-height: 1.5;
          ">
            <li style="margin-bottom: 6px;">Be specific about the context (work vs personal, formal vs casual)</li>
            <li style="margin-bottom: 6px;">Upload relevant documents for AI to reference your style</li>
            <li>Try different phrasings to get various suggestion styles</li>
          </ul>
        </div>
      </div>

      <!-- Enhanced Footer -->
      <div style="
        padding: 24px 32px 32px;
        border-top: 1px solid #e2e8f0;
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span style="font-size: 16px;">🤖</span>
          <span>Powered by InfilloAI</span>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button id="cancel-btn" style="
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            background: white;
            color: #475569;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          ">
            Cancel
          </button>
          <button id="regenerate-btn" style="
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          ">
            <span id="btn-text" style="position: relative; z-index: 1;">✨ Enhance Suggestion</span>
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Get elements for event handling
    const closeBtn = modal.querySelector('#close-modal') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
    const regenerateBtn = modal.querySelector('#regenerate-btn') as HTMLButtonElement;
    const fileUploadArea = modal.querySelector('#file-upload-area') as HTMLElement;
    const fileInput = modal.querySelector('#file-input') as HTMLInputElement;
    const contextTextarea = modal.querySelector('#context-text') as HTMLTextAreaElement;

    // Enhanced close modal with animation
    const closeModal = () => {
      overlay.style.animation = 'enhanceFadeOut 0.2s ease-in-out';
      modal.style.animation = 'enhanceModalSlideOut 0.2s ease-in-out';
      
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        // Restore suggestion popup
        if (this.popup) {
          this.popup.style.display = 'block';
        }
      }, 200);
    };

    // Enhanced regenerate function
    const regenerateSuggestion = async () => {
      const contextText = contextTextarea.value.trim();
      
      if (!contextText) {
        // Show nice validation message
        contextTextarea.style.borderColor = '#ef4444';
        contextTextarea.style.background = '#fef2f2';
        
        // Create temporary validation message
        const existingError = modal.querySelector('#validation-error');
        if (!existingError) {
          const validationMsg = document.createElement('div');
          validationMsg.id = 'validation-error';
          validationMsg.style.cssText = `
            color: #dc2626;
            font-size: 13px;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: shake 0.5s ease-in-out;
          `;
          validationMsg.innerHTML = '<span style="font-size: 16px;">⚠️</span> Please provide some context to improve the suggestion.';
          contextTextarea.parentElement!.appendChild(validationMsg);
          
          // Add shake animation
          if (!document.querySelector('#validation-styles')) {
            const shakeStyle = document.createElement('style');
            shakeStyle.id = 'validation-styles';
            shakeStyle.textContent = `
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
              }
            `;
            document.head.appendChild(shakeStyle);
          }
          
          // Remove validation message after 3 seconds
          setTimeout(() => {
            contextTextarea.style.borderColor = '#e5e7eb';
            contextTextarea.style.background = '#fafbfc';
            validationMsg.remove();
          }, 3000);
        }
        
        // Focus the textarea
        contextTextarea.focus();
        return;
      }

      // Show beautiful loading state
      regenerateBtn.disabled = true;
      const btnText = regenerateBtn.querySelector('#btn-text') as HTMLElement;
      btnText.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff40;
            border-top: 2px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></span>
          Enhancing...
        </span>
      `;

      // Add spin animation
      if (!document.querySelector('#loading-styles')) {
        const loadingStyle = document.createElement('style');
        loadingStyle.id = 'loading-styles';
        loadingStyle.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(loadingStyle);
      }

      try {
        // Call the actual refine API with formId and context
        if (!this.formId) {
          throw new Error('No formId available for refinement');
        }

        console.log('🔧 SuggestionPopup: Calling refineFormField API with:', {
          formId: this.formId,
          fieldName: suggestion.fieldName,
          previousValue: suggestion.value,
          contextText: contextText
        });

        const result = await apiService.refineFormField({
          formId: this.formId,
          fieldName: suggestion.fieldName,
          previousValue: suggestion.value,
          contextText: contextText
        });

        if (!result.success || !result.data?.refinedSuggestions?.length) {
          throw new Error('No refined suggestions returned from API');
        }

        console.log('✅ SuggestionPopup: API refinement successful:', result.data);

        // Get the best refined suggestion
        const bestRefinedSuggestion = result.data.refinedSuggestions[0];
        const enhancedValue = bestRefinedSuggestion.value || bestRefinedSuggestion;
        
        // Close modal with success feedback
        closeModal();

        // Show success message briefly
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          z-index: 2147483651;
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
          animation: slideInRight 0.3s ease-out;
        `;
        successMsg.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">✨</span>
            Suggestion enhanced successfully!
          </div>
        `;
        
        // Add slide animation
        if (!document.querySelector('#success-styles')) {
          const successStyle = document.createElement('style');
          successStyle.id = 'success-styles';
          successStyle.textContent = `
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `;
          document.head.appendChild(successStyle);
        }
        
        document.body.appendChild(successMsg);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
          if (document.body.contains(successMsg)) {
            document.body.removeChild(successMsg);
          }
        }, 3000);

        // Use the enhanced suggestion from the API
        this.handleAccept(enhancedValue);

      } catch (error) {
        console.error('Error generating enhanced suggestion:', error);
        
        // Show error with nice styling
        btnText.innerHTML = '❌ Enhancement failed';
        regenerateBtn.style.background = '#ef4444';
        
        setTimeout(() => {
          btnText.innerHTML = '✨ Enhance Suggestion';
          regenerateBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)';
          regenerateBtn.disabled = false;
        }, 2000);
      }
    };

    // Event listeners with enhanced interactions
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    regenerateBtn.addEventListener('click', regenerateSuggestion);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyPress);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        regenerateSuggestion();
      }
    };
    document.addEventListener('keydown', handleKeyPress);

    // Enhanced hover effects
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      closeBtn.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.transform = 'translateY(-2px)';
      cancelBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.transform = 'translateY(0)';
      cancelBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    });

    regenerateBtn.addEventListener('mouseenter', () => {
      regenerateBtn.style.transform = 'translateY(-2px)';
      regenerateBtn.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
    });
    regenerateBtn.addEventListener('mouseleave', () => {
      regenerateBtn.style.transform = 'translateY(0)';
      regenerateBtn.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
    });

    // Enhanced file upload interactions
    fileUploadArea.addEventListener('click', () => fileInput.click());
    
    fileUploadArea.addEventListener('mouseenter', () => {
      fileUploadArea.style.borderColor = '#3b82f6';
      fileUploadArea.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
      fileUploadArea.style.transform = 'translateY(-2px)';
    });
    
    fileUploadArea.addEventListener('mouseleave', () => {
      fileUploadArea.style.borderColor = '#d1d5db';
      fileUploadArea.style.background = 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';
      fileUploadArea.style.transform = 'translateY(0)';
    });

    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const uploadedFilesDiv = modal.querySelector('#uploaded-files') as HTMLElement;
        uploadedFilesDiv.innerHTML = `
          <div style="
            padding: 16px 20px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #0ea5e9;
            border-radius: 12px;
            font-size: 14px;
            color: #0c4a6e;
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            <span style="font-size: 20px;">📄</span>
            <div>
              <div style="font-weight: 600; margin-bottom: 2px;">
                ${files.length} file${files.length > 1 ? 's' : ''} selected
              </div>
              <div style="font-size: 12px; opacity: 0.8;">
                ${Array.from(files).map(f => f.name).join(', ')}
              </div>
            </div>
          </div>
        `;
      }
    });

    // Enhanced textarea focus effects
    contextTextarea.addEventListener('focus', () => {
      contextTextarea.style.borderColor = '#3b82f6';
      contextTextarea.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      contextTextarea.style.background = '#ffffff';
    });

    contextTextarea.addEventListener('blur', () => {
      contextTextarea.style.borderColor = '#e5e7eb';
      contextTextarea.style.boxShadow = 'none';
      contextTextarea.style.background = '#fafbfc';
    });

    // Auto-focus the textarea after a short delay
    setTimeout(() => contextTextarea.focus(), 300);

    console.log('✨ Beautiful enhance suggestion modal created and shown');
  }

  /**
   * Handle info action
   */
  private async handleInfo(suggestion: SuggestionData): Promise<void> {
    console.log('🔍 SuggestionPopup: Info button clicked! suggestion:', suggestion);
    
    // Hide suggestion popup temporarily
    if (this.popup) {
      this.popup.style.display = 'none';
    }
    
    // Create beautiful info modal
    this.showSuggestionInfoModal(suggestion);
  }

  /**
   * Show beautiful info modal explaining the suggestion reasoning
   */
  private showSuggestionInfoModal(suggestion: SuggestionData): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 2147483650 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(4px) !important;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white !important;
      border-radius: 20px !important;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
      padding: 0 !important;
      width: 90% !important;
      max-width: 540px !important;
      max-height: 85vh !important;
      overflow: hidden !important;
      position: relative !important;
      animation: modalSlideIn 0.3s ease-out !important;
    `;

    // Add animation keyframes to document head if not already present
    if (!document.querySelector('#suggestion-info-modal-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'suggestion-info-modal-styles';
      styleSheet.textContent = `
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Get confidence color based on percentage
    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 80) return '#22c55e'; // Green
      if (confidence >= 60) return '#f59e0b'; // Orange
      if (confidence >= 40) return '#eab308'; // Yellow
      return '#ef4444'; // Red
    };

    // Get confidence description
    const getConfidenceDescription = (confidence: number): string => {
      if (confidence >= 90) return 'Excellent match';
      if (confidence >= 80) return 'Very good match';
      if (confidence >= 70) return 'Good match';
      if (confidence >= 60) return 'Fair match';
      if (confidence >= 40) return 'Low match';
      return 'Poor match';
    };

    // Get source icon based on source type
    const getSourceIcon = (source: string): string => {
      const sourceLower = source.toLowerCase();
      if (sourceLower.includes('profile') || sourceLower.includes('user')) return '👤';
      if (sourceLower.includes('document') || sourceLower.includes('pdf')) return '📄';
      if (sourceLower.includes('form') || sourceLower.includes('previous')) return '📝';
      if (sourceLower.includes('ai') || sourceLower.includes('generated')) return '🤖';
      if (sourceLower.includes('browser') || sourceLower.includes('autofill')) return '🌐';
      return '💡';
    };

    modal.innerHTML = `
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 32px 32px 24px;
        color: white;
        position: relative;
      ">
        <button id="close-info-modal" style="
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">×</button>
        
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
          ">
            💡
          </div>
          <div>
            <h2 style="
              margin: 0 0 8px 0;
              font-size: 24px;
              font-weight: 700;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            ">
              Suggestion Insights
            </h2>
            <p style="
              margin: 0;
              font-size: 16px;
              opacity: 0.9;
              font-weight: 400;
            ">
              Understanding how this suggestion was generated
            </p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div style="padding: 32px; overflow-y: auto; max-height: 400px;">
        
        <!-- Suggested Value Card -->
        <div style="
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: ${getConfidenceColor(suggestion.confidence)};
          "></div>
          
          <div style="
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 12px;
          ">
            Suggested Value
          </div>
          
          <div style="
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 16px;
            line-height: 1.3;
            word-break: break-word;
          ">
            "${this.escapeHtml(suggestion.value)}"
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: white;
              padding: 8px 16px;
              border-radius: 25px;
              border: 1px solid #e2e8f0;
            ">
              <span style="font-size: 16px;">${getSourceIcon(suggestion.source)}</span>
              <span style="font-size: 14px; font-weight: 500; color: #374151;">
                ${this.escapeHtml(suggestion.source)}
              </span>
            </div>
            
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: ${getConfidenceColor(suggestion.confidence)}15;
              padding: 8px 16px;
              border-radius: 25px;
              border: 1px solid ${getConfidenceColor(suggestion.confidence)}30;
            ">
              <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${getConfidenceColor(suggestion.confidence)};
              "></div>
              <span style="
                font-size: 14px;
                font-weight: 600;
                color: ${getConfidenceColor(suggestion.confidence)};
              ">
                ${suggestion.confidence}% ${getConfidenceDescription(suggestion.confidence)}
              </span>
            </div>
          </div>
        </div>

        <!-- Explanation Section -->
        ${(suggestion as any).explanation ? `
          <div style="margin-bottom: 24px;">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 18px;
              font-weight: 600;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span style="font-size: 20px;">💬</span>
              Explanation
            </h3>
            
            <div style="
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border: 1px solid #0ea5e9;
              border-radius: 12px;
              padding: 20px 24px;
              font-size: 15px;
              line-height: 1.6;
              color: #0c4a6e;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 16px;
                right: 20px;
                font-size: 24px;
                opacity: 0.3;
              ">💡</div>
              "${this.escapeHtml((suggestion as any).explanation)}"
            </div>
          </div>
        ` : ''}

        <!-- Reasoning Section -->
        ${(suggestion as any).reasoning ? `
          <div style="margin-bottom: 24px;">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 18px;
              font-weight: 600;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span style="font-size: 20px;">🧠</span>
              AI Reasoning
            </h3>
            
            <div style="
              background: #f9fafb;
              border-left: 4px solid #3b82f6;
              padding: 20px 24px;
              border-radius: 0 12px 12px 0;
              font-size: 15px;
              line-height: 1.6;
              color: #374151;
              font-style: italic;
            ">
              "${this.escapeHtml((suggestion as any).reasoning)}"
            </div>
          </div>
        ` : ''}

        <!-- Field Context -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 20px;">🎯</span>
            Field Context
          </h3>
          
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
          ">
            <div style="
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                font-size: 12px;
                font-weight: 500;
                color: #6b7280;
                margin-bottom: 4px;
              ">
                Field Name
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #0f172a;">
                ${this.escapeHtml(suggestion.fieldName)}
              </div>
            </div>
            
            <div style="
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                font-size: 12px;
                font-weight: 500;
                color: #6b7280;
                margin-bottom: 4px;
              ">
                Field Type
              </div>
              <div style="font-size: 14px; font-weight: 600; color: #0f172a;">
                ${this.escapeHtml(suggestion.fieldType)}
              </div>
            </div>
          </div>
        </div>

        <!-- How It Works -->
        <div style="
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
        ">
          <h4 style="
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 18px;">⚡</span>
            How InfilloAI Works
          </h4>
          
          <p style="
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #92400e;
          ">
            InfilloAI analyzes your ${suggestion.source.toLowerCase() === 'profile data' ? 'profile information' : 
            suggestion.source.toLowerCase().includes('document') ? 'uploaded documents' : 
            'previous form entries'} and uses advanced AI to suggest the most relevant values for each field. 
            The confidence score reflects how well the suggestion matches the field context.
          </p>
        </div>

        <!-- Tips -->
        <div style="
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 12px;
          padding: 16px 20px;
        ">
          <h4 style="
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: #0369a1;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-size: 16px;">💫</span>
            Pro Tips
          </h4>
          <ul style="
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #0369a1;
            line-height: 1.4;
          ">
            <li style="margin-bottom: 4px;">Click "Edit" to refine the suggestion with additional context</li>
            <li style="margin-bottom: 4px;">Higher confidence scores indicate better matches</li>
            <li>Upload more documents to improve future suggestions</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        padding: 24px 32px;
        border-top: 1px solid #e2e8f0;
        background: #f9fafb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span style="font-size: 14px;">🤖</span>
          Powered by InfilloAI
        </div>
        
        <button id="got-it-btn" style="
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.2s ease;
        ">
          Got It!
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    const closeBtn = modal.querySelector('#close-info-modal') as HTMLButtonElement;
    const gotItBtn = modal.querySelector('#got-it-btn') as HTMLButtonElement;

    const closeModal = () => {
      overlay.style.animation = 'fadeOut 0.2s ease-in-out';
      modal.style.animation = 'modalSlideOut 0.2s ease-in-out';
      
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        // Restore suggestion popup
        if (this.popup) {
          this.popup.style.display = 'block';
        }
      }, 200);
    };

    // Add close animations
    if (!document.querySelector('#suggestion-info-modal-close-styles')) {
      const closeStyleSheet = document.createElement('style');
      closeStyleSheet.id = 'suggestion-info-modal-close-styles';
      closeStyleSheet.textContent = `
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
        }
      `;
      document.head.appendChild(closeStyleSheet);
    }

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    gotItBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyPress);
      }
    };
    document.addEventListener('keydown', handleKeyPress);

    // Hover effects for close button
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      closeBtn.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    });

    // Hover effects for Got It button
    gotItBtn.addEventListener('mouseenter', () => {
      gotItBtn.style.transform = 'translateY(-2px)';
      gotItBtn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
    });
    gotItBtn.addEventListener('mouseleave', () => {
      gotItBtn.style.transform = 'translateY(0)';
      gotItBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    });

    console.log('✨ Beautiful suggestion info modal created and shown');
  }

  /**
   * Handle clicks outside popup
   */
  private handleOutsideClick(e: Event): void {
    if (!this.popup) return;
    
    const target = e.target as HTMLElement;
    if (!this.popup.contains(target) && !this.popup.shadowRoot?.contains(target)) {
      this.hide();
      document.removeEventListener('click', this.handleOutsideClick.bind(this), true);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show suggestion popup with form data and refinement capabilities (NEW API)
   */
  async showWithFormData(field: HTMLElement, fieldInfo: {
    type: string;
    name: string;
    label: string;
  }, options: {
    formId?: string;
    initialSuggestions?: any[];
    onAccept?: (value: string) => void;
    onReject?: () => void;
    onRefine?: (context: { contextText?: string; customPrompt?: string; documentIds?: string[] }) => Promise<any[]>;
  } = {}): Promise<void> {
    console.log('SuggestionPopup: showWithFormData() called with:', { field, fieldInfo, options });
    
    try {
      // Hide any existing popup first (but preserve callbacks)
      if (this.popup) {
        document.body.removeChild(this.popup);
        this.popup = null;
      }
      
      // Set field and callback references AFTER hiding existing popup
      this.field = field;
      this.onAccept = options.onAccept;
      this.onReject = options.onReject;
      this.formId = options.formId; // Store formId for refine functionality
      
      // Convert initial suggestions to our format or get from API
      let suggestions: any[] = [];
      
      if (options.initialSuggestions && options.initialSuggestions.length > 0) {
        // Use provided initial suggestions
        suggestions = options.initialSuggestions.map(suggestion => ({
          value: suggestion.value,
          source: suggestion.source || 'AI Suggestion',
          confidence: suggestion.confidence || 75,
          fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
          fieldName: fieldInfo.name,
          explanation: suggestion.explanation || 'Generated from your form data'
        }));
        
        console.log('SuggestionPopup: Using initial suggestions:', suggestions);
      } else {
        // Fallback to legacy API
        console.log('SuggestionPopup: No initial suggestions, falling back to legacy API');
        const legacySuggestions = await this.getMultipleSuggestionsFromAPI(fieldInfo);
        suggestions = legacySuggestions.suggestions;
      }
      
      // Create suggestions data with refinement capability
      const suggestionsData: MultipleSuggestionsData = {
        suggestions,
        currentIndex: 0,
        fieldType: fieldInfo.label || this.humanizeFieldType(fieldInfo.type),
        fieldName: fieldInfo.name
      };
      
      this.currentSuggestions = suggestionsData;
      
      // Create popup with refinement capabilities
      this.popup = this.createMultipleSuggestionsPopup(suggestionsData, options.onRefine);
      this.positionPopup(field);
      document.body.appendChild(this.popup);
      
      // Force immediate visibility and animate
      this.popup.style.display = 'block';
      this.popup.style.visibility = 'visible';
      this.popup.style.opacity = '1';
      
      requestAnimationFrame(() => {
        if (this.popup) {
          const shadowRoot = this.popup.shadowRoot;
          if (shadowRoot) {
            const popupElement = shadowRoot.querySelector('.suggestion-popup') as HTMLElement;
            if (popupElement) {
              popupElement.style.opacity = '1';
              popupElement.style.transform = 'translateY(0)';
            }
          }
        }
      });
      
      console.log('SuggestionPopup: Form data popup shown successfully');
    } catch (error) {
      console.error('SuggestionPopup: Error in showWithFormData():', error);
    }
  }

  /**
   * Show refine modal for enhancing suggestions
   */
  private showRefineModal(onRefine: (context: { contextText?: string; customPrompt?: string; documentIds?: string[] }) => Promise<any[]>): void {
    console.log('🔧 SuggestionPopup: showRefineModal called');
    
    // Create overlay with backdrop blur
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.6) !important;
      z-index: 2147483650 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(4px) !important;
    `;

    // Create modal content with modern styling
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white !important;
      border-radius: 20px !important;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
      padding: 0 !important;
      width: 90% !important;
      max-width: 650px !important;
      max-height: 90vh !important;
      overflow: hidden !important;
      position: relative !important;
      animation: enhanceModalSlideIn 0.3s ease-out !important;
    `;

    modal.innerHTML = `
      <!-- Beautiful Gradient Header -->
      <div style="
        background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%);
        padding: 32px 32px 24px;
        color: white;
        position: relative;
        overflow: hidden;
      ">
        <button id="close-refine-modal" style="
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 1;
        ">×</button>
        
        <div style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1;">
          <div style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            border: 2px solid rgba(255, 255, 255, 0.3);
          ">
            ✨
          </div>
          <div>
            <h2 style="
              margin: 0 0 8px 0;
              font-size: 28px;
              font-weight: 700;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              letter-spacing: -0.5px;
            ">
              Enhance Suggestion
            </h2>
            <p style="
              margin: 0;
              font-size: 16px;
              opacity: 0.9;
              font-weight: 400;
            ">
              Add context to get a better suggestion
            </p>
          </div>
        </div>
      </div>

      <!-- Content Section -->
      <div style="padding: 32px; overflow-y: auto; max-height: 500px;">
        
        <!-- Context Input Section -->
        <div style="margin-bottom: 28px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 12px;
          ">
            <span style="font-size: 20px;">💬</span>
            Additional Context
          </label>
          
          <textarea id="refine-context" placeholder="Provide additional context to help improve the suggestion..." style="
            width: 100%;
            min-height: 120px;
            padding: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            resize: vertical;
            transition: all 0.2s ease;
            background: #fafbfc;
            color: #0f172a;
            line-height: 1.5;
          "></textarea>
        </div>

        <!-- Action Buttons -->
        <div style="
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        ">
          <button id="cancel-refine" style="
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: 2px solid #e2e8f0;
            background: white;
            color: #475569;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            Cancel
          </button>
          
          <button id="submit-refine" style="
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="font-size: 16px;">✨</span>
            Enhance Suggestion
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Cleanup function
    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    // Add event listeners
    document.getElementById('close-refine-modal')?.addEventListener('click', cleanup);
    document.getElementById('cancel-refine')?.addEventListener('click', cleanup);
    
    document.getElementById('submit-refine')?.addEventListener('click', () => {
      const contextText = (document.getElementById('refine-context') as HTMLTextAreaElement)?.value;
      console.log('🔧 SuggestionPopup: Refine submitted with context:', contextText);
      cleanup(); // Close modal immediately
      
      console.log('🔧 SuggestionPopup: Calling onRefine function...');
      onRefine({ contextText })
        .then(refinedSuggestions => {
          console.log('🔧 SuggestionPopup: onRefine completed successfully:', refinedSuggestions);
          // Hide the popup after successful refinement
          this.hide();
        })
        .catch(error => {
          console.error('🔧 SuggestionPopup: onRefine failed:', error);
        });
    });

    // Close modal when clicking outside
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });

    console.log('🔧 SuggestionPopup: Refine modal displayed');
  }
} 