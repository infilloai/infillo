/**
 * Form Detector Module for InfilloAI Extension
 * Detects form fields and displays widget icons similar to Grammarly
 */

import { CSSIsolation } from '@/utils/cssIsolation';
import { SuggestionPopup } from './suggestionPopup';
import { ApiService } from '@/utils/apiService';

export interface FormFieldConfig {
  showOnFocus?: boolean;
  showOnHover?: boolean;
  iconSize?: number;
  iconPosition?: 'right' | 'left';
  offset?: { x: number; y: number };
}

export interface DetectedForm {
  formId: string;
  fields: any[];
  suggestions?: Record<string, any[]>;
  url: string;
  domain: string;
}

export class FormDetector {
  private static instance: FormDetector | null = null;
  private isActive = false;
  private config: FormFieldConfig;
  private processedFields = new WeakSet<HTMLElement>();
  private activeWidgets = new Map<HTMLElement, HTMLElement>();
  private observer: MutationObserver | null = null;
  private iconUrl: string;
  private focusedField: HTMLElement | null = null;
  private suggestionPopup: SuggestionPopup;
  private formsDetectedCallbacks: (() => void)[] = [];
  private noFormsCallbacks: (() => void)[] = [];
  private lastFormCount = 0;
  private detectedForm: DetectedForm | null = null;
  private apiService: ApiService;
  private isDetectingForm = false;
  private pendingScanTimeout: number | null = null;
  private loadingIndicator: HTMLElement | null = null;
  private lastScannedFieldsSignature: string = '';
  private tabSwitchDebounceTimeout: number | null = null;

  private constructor(config: FormFieldConfig = {}) {
    this.config = {
      showOnFocus: true,
      showOnHover: true,
      iconSize: 24,
      iconPosition: 'right',
      offset: { x: 8, y: 0 },
      ...config
    };
    
    // Get the extension's icon URL - using PNG for better compatibility
    this.iconUrl = chrome.runtime.getURL('icons/icon32.png');
    
    // Initialize services
    this.apiService = ApiService.getInstance();
    this.suggestionPopup = new SuggestionPopup();
  }

  static getInstance(config?: FormFieldConfig): FormDetector {
    if (!FormDetector.instance) {
      FormDetector.instance = new FormDetector(config);
    }
    return FormDetector.instance;
  }

  /**
   * Register callback for when forms are detected
   */
  onFormsDetected(callback: () => void): void {
    this.formsDetectedCallbacks.push(callback);
  }

  /**
   * Register callback for when no forms are present
   */
  onNoForms(callback: () => void): void {
    this.noFormsCallbacks.push(callback);
  }

  /**
   * Check if any forms are currently detected
   */
  hasFormsDetected(): boolean {
    return this.findFormFields().length > 0;
  }

  /**
   * Get the current detected form data
   */
  getDetectedForm(): DetectedForm | null {
    return this.detectedForm;
  }

  /**
   * Check if form detection is currently active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Start monitoring for form fields
   */
  start(): void {
    if (this.isActive) {
      console.log('🟡 InfilloAI: Form detection already active, skipping restart');
      return;
    }
    
    this.isActive = true;
    
    console.log('🟢 InfilloAI: Form detection starting...');
    console.log('🟢 InfilloAI: Current URL:', window.location.href);
    console.log('🟢 InfilloAI: Document ready state:', document.readyState);
    
    // Reset state for clean restart
    this.detectedForm = null;
    this.isDetectingForm = false;
    
    // Add delay to ensure DOM is ready, but shorter delay for better responsiveness
    this.pendingScanTimeout = setTimeout(() => {
      if (!this.isActive) {
        console.log('🟡 InfilloAI: Form detection was stopped before delayed scan could start');
        return;
      }
      
      console.log('🟢 InfilloAI: Delayed scan starting...');
      this.scanExistingFields();
      this.setupMutationObserver();
      this.setupGlobalEventListeners();
      this.pendingScanTimeout = null; // Clear reference after execution
    }, 500); // Reduced from 1000ms for faster toggling
    
    console.log('✅ InfilloAI: Form detection started successfully');
  }

  /**
   * Stop monitoring for form fields
   */
  stop(): void {
    if (!this.isActive) {
      console.log('🟡 InfilloAI: Form detection already inactive, skipping stop');
      return;
    }
    
    console.log('🔴 InfilloAI: Form detection stopping...');
    console.log('🔴 InfilloAI: Current active widgets before stop:', this.activeWidgets.size);
    
    // Set inactive flag FIRST to prevent any new widgets from being created
    this.isActive = false;
    
    // Clear any pending timeouts that might create widgets
    if (this.pendingScanTimeout) {
      clearTimeout(this.pendingScanTimeout);
      this.pendingScanTimeout = null;
      console.log('🔴 InfilloAI: Cleared pending scan timeout');
    }
    
    // Clear tab switch debounce timeout
    if (this.tabSwitchDebounceTimeout) {
      clearTimeout(this.tabSwitchDebounceTimeout);
      this.tabSwitchDebounceTimeout = null;
      console.log('🔴 InfilloAI: Cleared tab switch debounce timeout');
    }
    
    // Run cleanup
    this.cleanup();
    
    // Double-check that we're really stopped
    console.log('🔴 InfilloAI: Final state after stop:', {
      isActive: this.isActive,
      activeWidgetsCount: this.activeWidgets.size,
      detectedForm: this.detectedForm,
      isDetectingForm: this.isDetectingForm
    });
    
    console.log('✅ InfilloAI: Form detection stopped successfully');
  }

  /**
   * Scan existing form fields on the page and detect form via API
   */
  private async scanExistingFields(): Promise<void> {
    // Don't scan if form detection is inactive
    if (!this.isActive) {
      console.log('🟡 InfilloAI: Skipping field scan - form detection is inactive');
      return;
    }
    
    console.log('🔍 InfilloAI: Starting to scan for form fields...');
    console.log('🔍 InfilloAI: Total elements on page:', document.querySelectorAll('*').length);
    console.log('🔍 InfilloAI: All inputs on page:', document.querySelectorAll('input').length);
    console.log('🔍 InfilloAI: All textareas on page:', document.querySelectorAll('textarea').length);
    
    const fields = this.findFormFields();
    console.log('🔍 InfilloAI: Found', fields.length, 'eligible form fields');
    
    if (fields.length === 0) {
      console.log('🔍 InfilloAI: No eligible form fields found.');
      console.log('🔍 InfilloAI: Debug - All inputs:', Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        visible: i.offsetWidth > 0 && i.offsetHeight > 0,
        display: window.getComputedStyle(i).display,
        visibility: window.getComputedStyle(i).visibility,
        disabled: i.disabled,
        readonly: i.readOnly
      })));
    } else {
      // Show loading indicator when starting API detection
      this.showLoadingIndicator();
      
      try {
        // Detect form via API when fields are found
        this.detectedForm = await this.detectFormViaAPI(fields);
        
        // Brief delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        // Always hide loading indicator when detection completes
        this.hideLoadingIndicator();
      }
    }
    
    // Update fields signature for tab switching detection
    this.lastScannedFieldsSignature = this.createFieldsSignature();
    
    // Process fields to show widgets ONLY if API returned valid form data
    if (this.isActive && this.detectedForm && this.detectedForm.suggestions && Object.keys(this.detectedForm.suggestions).length > 0) {
      console.log('✅ InfilloAI: Form data successfully loaded from backend, processing fields for widgets');
      
      fields.forEach((field, index) => {
        if (!this.isActive) return; // Double-check during iteration
        
        console.log(`🔍 InfilloAI: Processing field ${index + 1}/${fields.length}:`, {
          tagName: field.tagName,
          type: (field as HTMLInputElement).type,
          name: (field as HTMLInputElement).name,
          id: field.id,
          className: field.className
        });
        this.processField(field);
      });

      // Check for form count changes and trigger callbacks
      this.checkFormCountChange(fields.length);
    } else if (this.isActive) {
      console.log('🟡 InfilloAI: No valid form data returned from backend, skipping widget creation');
      // Still trigger no-forms callback if no suggestions were returned
      this.checkFormCountChange(0);
    } else {
      console.log('🟡 InfilloAI: Form detection became inactive during scan, skipping widget creation');
    }
  }

  /**
   * Detect form via API and store initial suggestions
   */
  private async detectFormViaAPI(fields: HTMLElement[]): Promise<DetectedForm | null> {
    if (this.isDetectingForm) {
      console.log('🔍 InfilloAI: Form detection already in progress');
      return this.detectedForm;
    }

    this.isDetectingForm = true;
    
    try {
      console.log('🔍 InfilloAI: Calling detect API...');
      
      // Get the outer HTML of the form container
      const formHTML = this.extractFormHTML(fields);
      const currentUrl = window.location.href;
      const currentDomain = window.location.hostname;
      
      // Call the new detect API
      const detectResponse = await this.apiService.detectForm({
        html: formHTML,
        url: currentUrl,
        domain: currentDomain
      });
      
      if (detectResponse.success && detectResponse.data) {
        const detectedForm: DetectedForm = {
          formId: detectResponse.data.formId,
          fields: detectResponse.data.fields,
          suggestions: detectResponse.data.suggestions || {},
          url: currentUrl,
          domain: currentDomain
        };
        
        console.log('🔍 InfilloAI: Form detected successfully:', {
          formId: detectedForm.formId,
          fieldsCount: detectedForm.fields.length,
          suggestionsCount: Object.keys(detectedForm.suggestions || {}).length
        });
        return detectedForm;
      } else {
        console.warn('🔍 InfilloAI: Form detection API failed:', detectResponse);
      }
    } catch (error) {
      console.error('🔍 InfilloAI: Error detecting form via API:', error);
    } finally {
      this.isDetectingForm = false;
    }
    return null;
  }

  /**
   * Extract form HTML for API detection
   */
  private extractFormHTML(fields: HTMLElement[]): string {
    // Find the common form container
    const forms = Array.from(document.querySelectorAll('form'));
    
    if (forms.length > 0) {
      // If there are actual form elements, use the first one that contains our fields
      const containingForm = forms.find(form => 
        fields.some(field => form.contains(field))
      );
      
      if (containingForm) {
        return containingForm.outerHTML;
      }
    }
    
    // If no form container, create a wrapper with all detected fields
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-infillo-detected-form', 'true');
    
    fields.forEach(field => {
      const clone = field.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);
    });
    
    return wrapper.outerHTML;
  }

  /**
   * Find all form fields on the page
   */
  private findFormFields(): HTMLElement[] {
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input[type="search"]',
      'input[type="number"]',
      'input[type="date"]',
      'input[type="datetime-local"]',
      'input[type="month"]',
      'input[type="week"]',
      'input[type="time"]',
      'input:not([type])',
      'textarea',
      'div[contenteditable="true"]',
      'span[contenteditable="true"]',
      '[role="textbox"]'
    ];
    
    const fields = document.querySelectorAll<HTMLElement>(selectors.join(', '));
    return Array.from(fields).filter(field => {
      // Filter out hidden or disabled fields
      const style = window.getComputedStyle(field);
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' &&
                       !field.hasAttribute('disabled') &&
                       !field.hasAttribute('readonly');
      
      if (!isVisible) return false;
      
      // Filter out context modal and extension UI elements
      if (field.id === 'context-text' || 
          field.closest('[style*="z-index: 2147483650"]') || 
          field.closest('[data-infillo-extension]')) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Process a single form field
   */
  private processField(field: HTMLElement): void {
    // Don't process fields if form detection is inactive
    if (!this.isActive) {
      console.log('🟡 InfilloAI: Skipping field processing - form detection is inactive');
      return;
    }
    
    if (this.processedFields.has(field)) return;
    
    this.processedFields.add(field);
    this.attachFieldListeners(field);
  }

  /**
   * Attach event listeners to a form field
   */
  private attachFieldListeners(field: HTMLElement): void {
    // Focus events
    field.addEventListener('focus', this.handleFieldFocus.bind(this, field), true);
    field.addEventListener('blur', this.handleFieldBlur.bind(this, field), true);
    
    // Hover events
    if (this.config.showOnHover) {
      field.addEventListener('mouseenter', this.handleFieldMouseEnter.bind(this, field), true);
      field.addEventListener('mouseleave', this.handleFieldMouseLeave.bind(this, field), true);
    }
  }

  /**
   * Handle field focus event
   */
  private handleFieldFocus(field: HTMLElement): void {
    this.focusedField = field;
    if (this.config.showOnFocus) {
      this.showWidget(field);
    }
  }

  /**
   * Handle field blur event
   */
  private handleFieldBlur(field: HTMLElement): void {
    if (this.focusedField === field) {
      this.focusedField = null;
    }
    
    // Keep widget visible if hovering
    const widget = this.activeWidgets.get(field);
    if (widget && !widget.matches(':hover') && !field.matches(':hover')) {
      this.hideWidget(field);
    }
  }

  /**
   * Handle field mouse enter event
   */
  private handleFieldMouseEnter(field: HTMLElement): void {
    console.log('🖱️ InfilloAI: Mouse entered field:', {
      field: field,
      tagName: field.tagName,
      type: (field as HTMLInputElement).type,
      id: field.id,
      showOnHover: this.config.showOnHover,
      isFocused: field === this.focusedField,
      hasWidget: this.activeWidgets.has(field)
    });
    
    if (this.config.showOnHover || field === this.focusedField) {
      console.log('🖱️ InfilloAI: Conditions met, showing widget...');
      this.showWidget(field);
    } else {
      console.log('🖱️ InfilloAI: Conditions not met for showing widget');
    }
  }

  /**
   * Handle field mouse leave event
   */
  private handleFieldMouseLeave(field: HTMLElement, event: MouseEvent): void {
    const widget = this.activeWidgets.get(field);
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    // Don't hide if moving to the widget itself
    if (widget && (widget.contains(relatedTarget) || widget === relatedTarget)) {
      return;
    }
    
    // Don't hide if field is focused
    if (field === this.focusedField) {
      return;
    }
    
    this.hideWidget(field);
  }

  /**
   * Show widget for a form field
   */
  private showWidget(field: HTMLElement): void {
    // Don't create widgets if form detection is inactive
    if (!this.isActive) {
      console.log('🟡 InfilloAI: Skipping widget creation - form detection is inactive');
      return;
    }
    
    if (this.activeWidgets.has(field)) {
      console.log('InfilloAI: Widget already exists for field, skipping');
      return;
    }
    
    console.log('InfilloAI: Showing widget for field:', field);
    console.log('InfilloAI: Field rect:', field.getBoundingClientRect());
    console.log('InfilloAI: Field visible:', field.offsetWidth > 0 && field.offsetHeight > 0);
    
    const widget = this.createWidget(field);
    if (!widget) {
      console.error('InfilloAI: Failed to create widget');
      return;
    }
    
    this.activeWidgets.set(field, widget);
    this.positionWidget(field, widget);
    
    console.log('InfilloAI: Widget created and positioned');
    console.log('InfilloAI: Widget element:', widget);
    console.log('InfilloAI: Widget styles:', {
      display: widget.style.display,
      visibility: widget.style.visibility,
      position: widget.style.position,
      left: widget.style.left,
      top: widget.style.top,
      zIndex: widget.style.zIndex
    });
  }

  /**
   * Hide widget for a form field
   */
  private hideWidget(field: HTMLElement): void {
    const widget = this.activeWidgets.get(field);
    if (!widget) return;
    
    // Don't hide suggestion popup when widget disappears - let user decide
    // this.suggestionPopup.hide();
    
    // Add hide animation
    const shadowRoot = widget.shadowRoot;
    if (shadowRoot) {
      const iconElement = shadowRoot.querySelector('.infilloai-widget-icon') as HTMLElement;
      if (iconElement) {
        iconElement.style.opacity = '0';
        iconElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
          widget.remove();
          this.activeWidgets.delete(field);
        }, 200);
      }
    } else {
      widget.remove();
      this.activeWidgets.delete(field);
    }
  }

  /**
   * Create widget element
   */
  private createWidget(field: HTMLElement): HTMLElement {
    console.log('🔨 InfilloAI: createWidget() called for field:', field);
    console.log('🔨 InfilloAI: Icon URL:', this.iconUrl);
    console.log('🔨 InfilloAI: Config:', this.config);
    
    const styles = `
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      .infilloai-widget-icon {
        width: ${this.config.iconSize}px;
        height: ${this.config.iconSize}px;
        background: white !important;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        pointer-events: all;
        display: flex !important;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        opacity: 1 !important;
        transform: scale(1) !important;
        border: 1px solid rgba(0, 0, 0, 0.1);
        position: relative !important;
        visibility: visible !important;
      }

      .infilloai-widget-icon:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: scale(1.1) !important;
        border-color: rgba(0, 0, 0, 0.15);
      }

      .infilloai-widget-icon:active {
        transform: scale(0.95) !important;
      }

      .infilloai-widget-icon img {
        width: ${this.config.iconSize! * 0.6}px;
        height: ${this.config.iconSize! * 0.6}px;
        display: block !important;
        user-select: none;
        -webkit-user-drag: none;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .infilloai-widget-icon .fallback-icon {
        width: ${this.config.iconSize! * 0.6}px;
        height: ${this.config.iconSize! * 0.6}px;
        background: #4F39F6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${this.config.iconSize! * 0.3}px;
      }

      .infilloai-widget-tooltip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .infilloai-widget-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
      }

      .infilloai-widget-icon:hover .infilloai-widget-tooltip {
        opacity: 1;
      }
    `;

    console.log('🔨 InfilloAI: Creating isolated container...');
    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-widget-${Date.now()}`,
      styles: styles
    });
    console.log('🔨 InfilloAI: Isolated container created:', { container, shadowRoot });

    const iconElement = document.createElement('div');
    iconElement.className = 'infilloai-widget-icon';
    console.log('🔨 InfilloAI: Icon element created:', iconElement);
    
    // Add debug info
    console.log('InfilloAI: Creating widget with icon URL:', this.iconUrl);
    
    iconElement.innerHTML = `
      <img src="${this.iconUrl}" alt="InfilloAI Assistant" draggable="false" onerror="console.log('InfilloAI: Icon failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: none;">
      <div class="fallback-icon" style="display: flex;">I</div>
      <div class="infilloai-widget-tooltip">InfilloAI Form Assistant</div>
    `;

    // Try to load the icon image
    const img = iconElement.querySelector('img') as HTMLImageElement;
    if (img) {
      img.onload = () => {
        console.log('InfilloAI: Icon loaded successfully');
        img.style.display = 'block';
        const fallback = iconElement.querySelector('.fallback-icon') as HTMLElement;
        if (fallback) fallback.style.display = 'none';
      };
      
      // Force reload the image
      img.src = this.iconUrl;
    }

    // Add click handler
    iconElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleWidgetClick(field);
    });

    // Prevent widget from disappearing when hovering over it
    iconElement.addEventListener('mouseenter', () => {
      this.showWidget(field);
    });

    iconElement.addEventListener('mouseleave', (e) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!field.contains(relatedTarget) && field !== relatedTarget && field !== this.focusedField) {
        this.hideWidget(field);
      }
    });

    console.log('🔨 InfilloAI: Appending icon to shadow root...');
    shadowRoot.appendChild(iconElement);
    console.log('🔨 InfilloAI: Appending container to document body...');
    document.body.appendChild(container);
    
    console.log('🔨 InfilloAI: Final widget container:', {
      id: container.id,
      visible: container.offsetWidth > 0 && container.offsetHeight > 0,
      inDOM: document.contains(container),
      style: {
        display: container.style.display,
        visibility: container.style.visibility,
        position: container.style.position
      }
    });

    return container;
  }

  /**
   * Position widget relative to form field
   */
  private positionWidget(field: HTMLElement, widget: HTMLElement): void {
    console.log('📍 InfilloAI: positionWidget() called');
    console.log('📍 InfilloAI: Field:', field);
    console.log('📍 InfilloAI: Widget:', widget);
    
    const rect = field.getBoundingClientRect();
    console.log('📍 InfilloAI: Field rect:', rect);
    
    // Calculate position based on configuration (using fixed positioning now)
    let left: number;
    let top: number;
    
    if (this.config.iconPosition === 'right') {
      left = rect.right - this.config.iconSize! - this.config.offset!.x;
    } else {
      left = rect.left + this.config.offset!.x;
    }
    
    // Center vertically in the field
    top = rect.top + (rect.height - this.config.iconSize!) / 2 + this.config.offset!.y;
    
    console.log('📍 InfilloAI: Calculated position:', { left, top, rect });
    
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    widget.style.position = 'fixed';
    widget.style.zIndex = '2147483647';
    
    // Ensure visibility
    widget.style.display = 'block';
    widget.style.visibility = 'visible';
    widget.style.opacity = '1';
    
    console.log('📍 InfilloAI: Final widget styles applied:', {
      left: widget.style.left,
      top: widget.style.top,
      position: widget.style.position,
      zIndex: widget.style.zIndex,
      display: widget.style.display,
      visibility: widget.style.visibility,
      opacity: widget.style.opacity
    });
  }

  /**
   * Handle widget click
   */
  private async handleWidgetClick(field: HTMLElement): Promise<void> {
    console.log('InfilloAI: Widget clicked for field:', field);
    
    try {
      // Get field details
      const fieldType = (field as HTMLInputElement).type || 'text';
      const fieldName = (field as HTMLInputElement).name || field.id || '';
      const fieldLabel = this.findFieldLabel(field);
      
      console.log('InfilloAI: Field details:', { fieldType, fieldName, fieldLabel });
      
      // Get initial suggestions from detected form data
      let initialSuggestions: any[] = [];
      const detectedForm = this.detectedForm;
      if (detectedForm && detectedForm.suggestions && detectedForm.suggestions[fieldName]) {
        initialSuggestions = detectedForm.suggestions[fieldName];
        console.log('InfilloAI: Found initial suggestions for field:', initialSuggestions);
      }
      
      // Show suggestion popup with form data and refinement capabilities
      await this.suggestionPopup.showWithFormData(field, {
        type: fieldType,
        name: fieldName,
        label: fieldLabel
      }, {
        formId: this.detectedForm?.formId,
        initialSuggestions,
        onAccept: (value) => {
          console.log('InfilloAI: Suggestion accepted:', value);
          
          // Fill the field with the accepted value
          if (field.tagName.toLowerCase() === 'input' || field.tagName.toLowerCase() === 'textarea') {
            (field as HTMLInputElement | HTMLTextAreaElement).value = value;
          } else if (field.contentEditable === 'true') {
            field.textContent = value;
          }
          
          // Trigger input events for frameworks that listen to them
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Send acceptance to background script for analytics
          chrome.runtime.sendMessage({
            type: 'SUGGESTION_ACCEPTED',
            data: { 
              fieldType, 
              fieldName, 
              value,
              formId: this.detectedForm?.formId,
              source: 'widget_click'
            }
          });
        },
        onReject: () => {
          console.log('InfilloAI: Suggestion rejected');
          // Send rejection to background script for analytics
          chrome.runtime.sendMessage({
            type: 'SUGGESTION_REJECTED',
            data: { 
              fieldType, 
              fieldName,
              formId: this.detectedForm?.formId,
              source: 'widget_click'
            }
          });
        },
        onRefine: async (context: { contextText?: string; customPrompt?: string; documentIds?: string[] }) => {
          console.log('InfilloAI: Refining suggestions with context:', context);
          
          if (!this.detectedForm?.formId) {
            console.warn('InfilloAI: No form ID available for refinement');
            return [];
          }
          
          try {
            // Call the refine API
            const refineResponse = await this.apiService.refineFormField({
              formId: this.detectedForm.formId,
              fieldName,
              previousValue: (field as HTMLInputElement).value || '',
              contextText: context.contextText,
              customPrompt: context.customPrompt,
              documentIds: context.documentIds
            });
            
            if (refineResponse.success && refineResponse.data) {
              console.log('InfilloAI: Refinement successful:', refineResponse.data);
              
              // Update stored suggestions with refined ones
              const currentDetectedForm = this.detectedForm;
              if (currentDetectedForm && currentDetectedForm.suggestions && refineResponse.data.allSuggestions) {
                currentDetectedForm.suggestions[fieldName] = refineResponse.data.allSuggestions;
              }
              
              // Return refined suggestions
              return refineResponse.data.refinedSuggestions || [];
            } else {
              console.warn('InfilloAI: Refinement API failed:', refineResponse);
              return [];
            }
          } catch (error) {
            console.error('InfilloAI: Error refining suggestions:', error);
            return [];
          }
        }
      });
      
      console.log('InfilloAI: Enhanced suggestion popup shown with form data');
    } catch (error) {
      console.error('InfilloAI: Error handling widget click:', error);
      
      // Fallback to legacy popup if form data is not available
      try {
        const fieldType = (field as HTMLInputElement).type || 'text';
        const fieldName = (field as HTMLInputElement).name || field.id || '';
        const fieldLabel = this.findFieldLabel(field);
        
        await this.suggestionPopup.showWithField(field, {
          type: fieldType,
          name: fieldName,
          label: fieldLabel
        }, {
          onAccept: (value) => {
            console.log('InfilloAI: Fallback suggestion accepted:', value);
            chrome.runtime.sendMessage({
              type: 'SUGGESTION_ACCEPTED',
              data: { fieldType, fieldName, value, source: 'fallback' }
            });
          },
          onReject: () => {
            console.log('InfilloAI: Fallback suggestion rejected');
            chrome.runtime.sendMessage({
              type: 'SUGGESTION_REJECTED',
              data: { fieldType, fieldName, source: 'fallback' }
            });
          }
        });
      } catch (fallbackError) {
        console.error('InfilloAI: Fallback popup also failed:', fallbackError);
      }
    }
  }

  /**
   * Find label for a field
   */
  private findFieldLabel(field: HTMLElement): string {
    // Check for label with for attribute
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }
    
    // Check for parent label
    const parentLabel = field.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.replace(field.textContent || '', '').trim() || '';
    }
    
    // Check for aria-label
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check for placeholder as last resort
    return (field as HTMLInputElement).placeholder || '';
  }

  /**
   * Check for form count changes and trigger callbacks
   */
  private checkFormCountChange(currentFormCount: number): void {
    if (currentFormCount !== this.lastFormCount) {
      console.log(`🔍 InfilloAI: Form count changed from ${this.lastFormCount} to ${currentFormCount}`);
      
      if (currentFormCount > 0 && this.lastFormCount === 0) {
        // Forms detected for the first time
        console.log('🔍 InfilloAI: Forms detected - triggering callbacks');
        this.formsDetectedCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('InfilloAI: Error in forms detected callback:', error);
          }
        });
      } else if (currentFormCount === 0 && this.lastFormCount > 0) {
        // No forms detected anymore
        console.log('🔍 InfilloAI: No forms detected - triggering callbacks');
        this.noFormsCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('InfilloAI: Error in no forms callback:', error);
          }
        });
      }
      
      this.lastFormCount = currentFormCount;
    }
  }

  /**
   * Setup mutation observer to detect new form fields and tab changes
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let hasChanges = false;
      let hasVisibilityChanges = false;
      
      mutations.forEach((mutation) => {
        // Handle added nodes
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the node itself is a form field
            const fields = this.findFormFields();
            const nodeFields = fields.filter(field => node.contains(field) || node === field);
            nodeFields.forEach(field => this.processField(field));
            if (nodeFields.length > 0) {
              hasChanges = true;
            }
          }
        });
        
        // Handle removed nodes
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            hasChanges = true;
          }
        });

        // Handle attribute changes that might indicate tab switching
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          const attributeName = mutation.attributeName;
          
          // Check for visibility-related attribute changes
          if (attributeName && ['class', 'style', 'hidden', 'aria-hidden'].includes(attributeName)) {
            // Check if this element contains form fields
            const containedFields = this.findFormFields().filter(field => target.contains(field));
            if (containedFields.length > 0) {
              console.log('🔄 InfilloAI: Detected visibility change in element containing form fields:', {
                element: target,
                attribute: attributeName,
                fieldsCount: containedFields.length
              });
              hasVisibilityChanges = true;
            }
            
            // Also check if the target itself is a form field
            if (this.isFormField(target)) {
              console.log('🔄 InfilloAI: Detected visibility change on form field:', target);
              hasVisibilityChanges = true;
            }
          }
        }
      });
      
      // Handle changes with debouncing for tab switching
      if (hasChanges || hasVisibilityChanges) {
        this.handlePotentialTabSwitch();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    });
  }

  /**
   * Check if an element is a form field
   */
  private isFormField(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type?.toLowerCase();
    
    // Check for input fields
    if (tagName === 'input') {
      const validTypes = ['text', 'email', 'password', 'tel', 'url', 'search', 'number', 'date', 'datetime-local', 'month', 'week', 'time'];
      return !type || validTypes.includes(type);
    }
    
    // Check for textarea and contenteditable
    if (tagName === 'textarea') return true;
    if (element.contentEditable === 'true') return true;
    if (element.getAttribute('role') === 'textbox') return true;
    
    return false;
  }

  /**
   * Create a signature of currently visible form fields
   */
  private createFieldsSignature(): string {
    const fields = this.findFormFields();
    const fieldSignatures = fields.map(field => {
      const rect = field.getBoundingClientRect();
      return `${field.tagName}:${(field as HTMLInputElement).type || 'text'}:${field.id || ''}:${(field as HTMLInputElement).name || ''}:${rect.width > 0 && rect.height > 0}`;
    }).sort();
    
    return fieldSignatures.join('|');
  }

  /**
   * Handle potential tab switching with debouncing
   */
  private handlePotentialTabSwitch(): void {
    // Clear existing timeout
    if (this.tabSwitchDebounceTimeout) {
      clearTimeout(this.tabSwitchDebounceTimeout);
    }
    
    // Debounce to avoid excessive API calls
    this.tabSwitchDebounceTimeout = setTimeout(() => {
      this.checkForNewFields();
      this.tabSwitchDebounceTimeout = null;
    }, 300); // 300ms debounce
  }

  /**
   * Check for new form fields and trigger API call if needed
   */
  private async checkForNewFields(): Promise<void> {
    if (!this.isActive) return;
    
    const currentFieldsSignature = this.createFieldsSignature();
    const currentFields = this.findFormFields();
    
    console.log('🔍 InfilloAI: Checking for new fields after potential tab switch:', {
      currentFieldsCount: currentFields.length,
      lastSignature: this.lastScannedFieldsSignature,
      currentSignature: currentFieldsSignature,
      signaturesMatch: this.lastScannedFieldsSignature === currentFieldsSignature
    });
    
    if (this.lastScannedFieldsSignature !== currentFieldsSignature) {
      console.log('✅ InfilloAI: New form fields detected - triggering smart rescan');
      
      this.lastScannedFieldsSignature = currentFieldsSignature;
      
      if (currentFields.length > 0) {
        try {
          this.isDetectingForm = false;
          
          this.showLoadingIndicator();
          
          const detectedForm = await this.detectFormViaAPI(currentFields);
          this.detectedForm = detectedForm;
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const suggestions = detectedForm?.suggestions;
          if (suggestions && Object.keys(suggestions).length > 0) {
            console.log('✅ InfilloAI: Smart rescan found new form data, processing fields for widgets');
            
            currentFields.forEach((field, index) => {
              if (!this.isActive) return;
              
              console.log(`🔍 InfilloAI: Smart processing field ${index + 1}/${currentFields.length}:`, {
                tagName: field.tagName,
                type: (field as HTMLInputElement).type,
                name: (field as HTMLInputElement).name,
                id: field.id
              });
              this.processField(field);
            });
            
            this.checkFormCountChange(currentFields.length);
          } else {
            console.log('🟡 InfilloAI: Smart rescan completed but no valid form data returned');
            this.checkFormCountChange(0);
          }
        } catch (error) {
          console.error('❌ InfilloAI: Error during smart rescan:', error);
        } finally {
          this.hideLoadingIndicator();
        }
      } else {
        console.log('🟡 InfilloAI: No fields visible after tab switch');
        this.checkFormCountChange(0);
      }
    } else {
      console.log('🟡 InfilloAI: No significant field changes detected');
    }
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalEventListeners(): void {
    // Handle window resize to reposition widgets
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    window.addEventListener('scroll', this.handleWindowScroll.bind(this), true);
  }

  /**
   * Handle window resize
   */
  private handleWindowResize(): void {
    this.repositionAllWidgets();
  }

  /**
   * Handle window scroll
   */
  private handleWindowScroll(): void {
    this.repositionAllWidgets();
  }

  /**
   * Reposition all active widgets
   */
  private repositionAllWidgets(): void {
    this.activeWidgets.forEach((widget, field) => {
      this.positionWidget(field, widget);
    });
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    console.log('🧹 InfilloAI: Starting cleanup...');
    console.log('🧹 InfilloAI: Active widgets count:', this.activeWidgets.size);
    console.log('🧹 InfilloAI: Active widgets:', Array.from(this.activeWidgets.keys()));
    
    // Remove all widgets with enhanced removal
    let removedCount = 0;
    const widgetsToRemove = new Map(this.activeWidgets); // Create a copy to avoid modification during iteration
    
    widgetsToRemove.forEach((widget, field) => {
      console.log('🧹 InfilloAI: Removing widget for field:', field);
      console.log('🧹 InfilloAI: Widget element:', widget);
      console.log('🧹 InfilloAI: Widget is in DOM:', document.contains(widget));
      console.log('🧹 InfilloAI: Widget ID:', widget.id);
      console.log('🧹 InfilloAI: Widget parent:', widget.parentNode);
      
      try {
        // Try multiple removal strategies
        
        // Strategy 1: Standard remove()
        if (widget.parentNode) {
          widget.parentNode.removeChild(widget);
          console.log('✅ InfilloAI: Widget removed via parentNode.removeChild');
        } else if (widget.remove) {
          widget.remove();
          console.log('✅ InfilloAI: Widget removed via widget.remove()');
        }
        
        // Strategy 2: Force remove from DOM if still present
        if (document.contains(widget)) {
          console.warn('⚠️ InfilloAI: Widget still in DOM after removal, forcing removal...');
          widget.style.display = 'none !important';
          widget.style.visibility = 'hidden !important';
          widget.style.opacity = '0 !important';
          widget.style.pointerEvents = 'none !important';
          
          // Try harder removal
          if (widget.parentElement) {
            widget.parentElement.removeChild(widget);
            console.log('✅ InfilloAI: Widget force-removed via parentElement.removeChild');
          }
        }
        
        removedCount++;
        console.log('✅ InfilloAI: Widget removal completed');
      } catch (error) {
        console.error('❌ InfilloAI: Error removing widget:', error);
        
        // Last resort: hide the widget
        try {
          widget.style.display = 'none !important';
          widget.style.visibility = 'hidden !important';
          widget.style.opacity = '0 !important';
          widget.style.pointerEvents = 'none !important';
          widget.style.zIndex = '-9999 !important';
          console.log('⚠️ InfilloAI: Widget hidden as fallback');
        } catch (hideError) {
          console.error('❌ InfilloAI: Could not even hide widget:', hideError);
        }
      }
    });
    
    console.log('🧹 InfilloAI: Removed', removedCount, 'widgets');
    this.activeWidgets.clear();
    console.log('🧹 InfilloAI: Active widgets map cleared, new size:', this.activeWidgets.size);
    
    // Additional cleanup: Search for any remaining widgets by class/attribute and remove them
    console.log('🧹 InfilloAI: Scanning for remaining widgets...');
    const remainingWidgets = document.querySelectorAll('[id^="infilloai-widget-"]');
    if (remainingWidgets.length > 0) {
      console.warn('⚠️ InfilloAI: Found', remainingWidgets.length, 'remaining widgets, removing...');
      remainingWidgets.forEach((widget, index) => {
        try {
          console.log('🧹 InfilloAI: Removing remaining widget', index + 1, ':', widget);
          widget.remove();
          console.log('✅ InfilloAI: Remaining widget removed');
        } catch (error) {
          console.error('❌ InfilloAI: Error removing remaining widget:', error);
          // Hide as fallback
          (widget as HTMLElement).style.display = 'none !important';
        }
      });
    } else {
      console.log('✅ InfilloAI: No remaining widgets found');
    }
    
    // Hide suggestion popup
    console.log('🧹 InfilloAI: Hiding suggestion popup...');
    this.suggestionPopup.hide();
    
    // Hide loading indicator if it's shown
    console.log('🧹 InfilloAI: Hiding loading indicator...');
    this.hideLoadingIndicator();
    
    // Clear processed fields
    console.log('🧹 InfilloAI: Clearing processed fields...');
    this.processedFields = new WeakSet();
    
    // Disconnect observer
    if (this.observer) {
      console.log('🧹 InfilloAI: Disconnecting mutation observer...');
      this.observer.disconnect();
      this.observer = null;
    } else {
      console.log('🧹 InfilloAI: No mutation observer to disconnect');
    }
    
    // Remove event listeners
    console.log('🧹 InfilloAI: Removing global event listeners...');
    try {
      window.removeEventListener('resize', this.handleWindowResize.bind(this));
      window.removeEventListener('scroll', this.handleWindowScroll.bind(this), true);
      console.log('✅ InfilloAI: Global event listeners removed');
    } catch (error) {
      console.error('❌ InfilloAI: Error removing global event listeners:', error);
    }
    
    // Reset form detection state
    this.detectedForm = null;
    this.isDetectingForm = false;
    this.focusedField = null;
    this.lastFormCount = 0;
    this.lastScannedFieldsSignature = '';
    
    console.log('✅ InfilloAI: Cleanup completed successfully');
    
    // Final verification - check if any widgets are still visible
    setTimeout(() => {
      const stillVisible = document.querySelectorAll('[id^="infilloai-widget-"]:not([style*="display: none"])');
      if (stillVisible.length > 0) {
        console.error('❌ InfilloAI: WARNING - Some widgets are still visible after cleanup:', stillVisible);
        stillVisible.forEach(widget => {
          (widget as HTMLElement).style.display = 'none !important';
        });
      } else {
        console.log('✅ InfilloAI: Verification passed - no widgets visible after cleanup');
      }
    }, 100);
  }

  /**
   * Create loading indicator element
   */
  private createLoadingIndicator(): HTMLElement {
    const styles = `
      :host {
        all: initial;
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 2147483646 !important;
        pointer-events: none !important;
        display: block !important;
        visibility: visible !important;
      }

      .infilloai-loader {
        background: rgba(79, 57, 246, 0.95) !important;
        padding: 12px !important;
        border-radius: 50% !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        animation: slideIn 0.3s ease-out !important;
        width: 40px !important;
        height: 40px !important;
      }

      @keyframes slideIn {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .infilloai-spinner {
        width: 16px !important;
        height: 16px !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        border-top: 2px solid white !important;
        border-radius: 50% !important;
        animation: spin 1s linear infinite !important;
        flex-shrink: 0 !important;
        display: block !important;
      }

      @keyframes spin {
        0% { 
          transform: rotate(0deg);
        }
        100% { 
          transform: rotate(360deg);
        }
      }

      @keyframes slideOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(20px);
          opacity: 0;
        }
      }
    `;

    console.log('🔄 InfilloAI: Creating loading indicator with animation...');
    
    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-loader-${Date.now()}`,
      styles: styles
    });

    const loaderElement = document.createElement('div');
    loaderElement.className = 'infilloai-loader';
    
    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'infilloai-spinner';
    
    loaderElement.appendChild(spinnerElement);
    shadowRoot.appendChild(loaderElement);
    document.body.appendChild(container);

    // Force reflow to ensure animation starts
    container.offsetHeight;
    
    console.log('🔄 InfilloAI: Loading indicator created and added to DOM');
    console.log('🔄 InfilloAI: Spinner element:', spinnerElement);
    console.log('🔄 InfilloAI: Animation should be running...');

    return container;
  }

  /**
   * Show loading indicator
   */
  private showLoadingIndicator(): void {
    if (this.loadingIndicator || !this.isActive) return;
    
    console.log('🔄 InfilloAI: Showing loading indicator...');
    this.loadingIndicator = this.createLoadingIndicator();
  }

  /**
   * Hide loading indicator
   */
  private hideLoadingIndicator(): void {
    if (!this.loadingIndicator) return;
    
    console.log('✅ InfilloAI: Hiding loading indicator...');
    
    try {
      // Add fade out animation
      const shadowRoot = this.loadingIndicator.shadowRoot;
      if (shadowRoot) {
        const loaderElement = shadowRoot.querySelector('.infilloai-loader') as HTMLElement;
        if (loaderElement) {
          // Use the slideOut animation that's already defined in the styles
          loaderElement.style.setProperty('animation', 'slideOut 0.3s ease-in forwards', 'important');
        }
      }
      
      // Remove after animation
      setTimeout(() => {
        if (this.loadingIndicator) {
          this.loadingIndicator.remove();
          this.loadingIndicator = null;
          console.log('✅ InfilloAI: Loading indicator removed from DOM');
        }
      }, 300);
    } catch (error) {
      console.error('Error hiding loading indicator:', error);
      // Fallback: remove immediately
      if (this.loadingIndicator) {
        this.loadingIndicator.remove();
        this.loadingIndicator = null;
      }
    }
  }
} 