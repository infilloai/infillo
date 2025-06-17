/**
 * Context Modal Component for Enhanced Suggestions
 * Allows users to provide additional context (text or documents) to improve autofill suggestions
 */

import { CSSIsolation } from '@/utils/cssIsolation';
import { ApiService } from '@/utils/apiService';
import { SuggestionData } from './suggestionPopup';

export interface ContextModalOptions {
  currentSuggestion: SuggestionData;
  fieldInfo: {
    type: string;
    name: string;
    label: string;
  };
  onEnhancedSuggestion: (newSuggestion: SuggestionData) => void;
  onCancel: () => void;
}

export class ContextModal {
  private modal: HTMLElement | null = null;
  private apiService: ApiService;
  private options: ContextModalOptions;
  private uploadedFiles: File[] = [];

  constructor(options: ContextModalOptions) {
    this.options = options;
    this.apiService = ApiService.getInstance();
  }

  /**
   * Show the context modal
   */
  show(): void {
    if (this.modal) return; // Already showing

    this.modal = this.createModal();
    document.body.appendChild(this.modal);
    
    // Focus management for accessibility
    setTimeout(() => {
      const firstInput = this.modal?.shadowRoot?.querySelector('textarea') as HTMLElement;
      firstInput?.focus();
    }, 100);

    // Animate in
    requestAnimationFrame(() => {
      if (this.modal) {
        const shadowRoot = this.modal.shadowRoot;
        if (shadowRoot) {
          const modalElement = shadowRoot.querySelector('.context-modal') as HTMLElement;
          const overlayElement = shadowRoot.querySelector('.modal-overlay') as HTMLElement;
          if (modalElement && overlayElement) {
            overlayElement.style.opacity = '1';
            modalElement.style.opacity = '1';
            modalElement.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        }
      }
    });
  }

  /**
   * Hide the context modal
   */
  hide(): void {
    if (!this.modal) return;

    const shadowRoot = this.modal.shadowRoot;
    if (shadowRoot) {
      const modalElement = shadowRoot.querySelector('.context-modal') as HTMLElement;
      const overlayElement = shadowRoot.querySelector('.modal-overlay') as HTMLElement;
      if (modalElement && overlayElement) {
        overlayElement.style.opacity = '0';
        modalElement.style.opacity = '0';
        modalElement.style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        setTimeout(() => {
          if (this.modal) {
            this.modal.remove();
            this.modal = null;
          }
        }, 200);
      }
    }
  }

  /**
   * Create the modal element
   */
  private createModal(): HTMLElement {
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      
      :host {
        all: initial;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483649 !important;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
      }

      * {
        all: unset;
        display: revert;
        box-sizing: border-box;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        pointer-events: all;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1;
      }

      .context-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        border: 1px solid #E2E8F0;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        pointer-events: all;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 2;
      }

      .modal-header {
        padding: 24px 24px 20px;
        border-bottom: 1px solid #E2E8F0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
      }

      .close-button {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: #f8fafc;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        font-size: 18px;
      }

      .close-button:hover {
        background: #f1f5f9;
        color: #475569;
      }

      .modal-body {
        padding: 24px;
        max-height: calc(80vh - 200px);
        overflow-y: auto;
      }

      .current-suggestion {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
      }

      .suggestion-label {
        font-size: 12px;
        font-weight: 500;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .suggestion-value {
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 4px;
      }

      .suggestion-source {
        font-size: 12px;
        color: #64748b;
      }

      .form-group {
        margin-bottom: 24px;
      }

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
      }

      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s ease;
        background: white;
        color: #374151;
        resize: vertical;
        min-height: 120px;
      }

      .form-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-input::placeholder {
        color: #9ca3af;
      }

      .file-upload {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #f9fafb;
      }

      .file-upload:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .file-upload.dragover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .file-upload-icon {
        font-size: 32px;
        margin-bottom: 12px;
        color: #6b7280;
      }

      .file-upload-text {
        font-size: 14px;
        color: #374151;
        margin-bottom: 4px;
      }

      .file-upload-hint {
        font-size: 12px;
        color: #6b7280;
      }

      .file-input {
        display: none;
      }

      .uploaded-files {
        margin-top: 16px;
      }

      .file-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .file-info {
        display: flex;
        align-items: center;
      }

      .file-icon {
        margin-right: 12px;
        font-size: 16px;
        color: #6b7280;
      }

      .file-name {
        font-size: 14px;
        color: #374151;
        margin-bottom: 2px;
      }

      .file-size {
        font-size: 12px;
        color: #6b7280;
      }

      .remove-file {
        padding: 4px 8px;
        background: #fee2e2;
        color: #dc2626;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .remove-file:hover {
        background: #fecaca;
      }

      .modal-footer {
        padding: 20px 24px 24px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .btn-secondary {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;
      }

      .btn-secondary:hover {
        background: #f1f5f9;
        color: #334155;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-primary:hover {
        background: #2563eb;
      }

      .btn-primary:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-message {
        background: #fee2e2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        margin-top: 16px;
        display: none;
      }

      .error-message.show {
        display: block;
      }
    `;

    const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
      id: `infilloai-context-modal-${Date.now()}`,
      styles: styles
    });

    const modalElement = document.createElement('div');
    modalElement.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="context-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">Enhance Suggestion</h2>
          <button class="close-button" aria-label="Close modal" data-action="close">
            ×
          </button>
        </div>
        
        <div class="modal-body">
          <div class="current-suggestion">
            <div class="suggestion-label">Current Suggestion</div>
            <div class="suggestion-value">${this.escapeHtml(this.options.currentSuggestion.value)}</div>
            <div class="suggestion-source">from: ${this.escapeHtml(this.options.currentSuggestion.source)}</div>
          </div>

          <div class="form-group">
            <label for="context-text" class="form-label">
              Additional Context
              <span style="color: #6b7280; font-weight: 400;">(optional)</span>
            </label>
            <textarea 
              id="context-text" 
              class="form-input" 
              placeholder="Provide additional context to improve the suggestion. For example: 'Use my work address' or 'This is for a business inquiry'..."
              aria-describedby="context-hint"
            ></textarea>
            <div id="context-hint" style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              The more specific you are, the better the suggestion will be.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Upload Documents
              <span style="color: #6b7280; font-weight: 400;">(optional)</span>
            </label>
            <div class="file-upload" tabindex="0" role="button" aria-describedby="file-hint">
              <div class="file-upload-icon">📄</div>
              <div class="file-upload-text">Click to upload or drag and drop</div>
              <div class="file-upload-hint" id="file-hint">PDF, DOC, DOCX, TXT files up to 10MB</div>
            </div>
            <input type="file" class="file-input" multiple accept=".pdf,.doc,.docx,.txt" aria-label="Choose files">
            <div class="uploaded-files"></div>
          </div>

          <div class="error-message" role="alert" aria-live="polite"></div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">
            Cancel
          </button>
          <button class="btn btn-primary" data-action="regenerate">
            <span class="btn-text">Regenerate Suggestion</span>
            <div class="loading-spinner" style="display: none;"></div>
          </button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(modalElement);
    this.attachEventListeners(shadowRoot);

    return container;
  }

  /**
   * Attach event listeners to modal elements
   */
  private attachEventListeners(shadowRoot: ShadowRoot): void {
    // Close modal handlers
    const overlay = shadowRoot.querySelector('.modal-overlay');
    const closeButton = shadowRoot.querySelector('[data-action="close"]');
    const cancelButton = shadowRoot.querySelector('[data-action="cancel"]');

    overlay?.addEventListener('click', () => this.handleCancel());
    closeButton?.addEventListener('click', () => this.handleCancel());
    cancelButton?.addEventListener('click', () => this.handleCancel());

    // Regenerate button
    const regenerateButton = shadowRoot.querySelector('[data-action="regenerate"]');
    regenerateButton?.addEventListener('click', () => this.handleRegenerate());

    // File upload handling
    const fileUpload = shadowRoot.querySelector('.file-upload');
    const fileInput = shadowRoot.querySelector('.file-input') as HTMLInputElement;

    fileUpload?.addEventListener('click', () => fileInput?.click());
    fileUpload?.addEventListener('keydown', (e) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });

    // Drag and drop
    fileUpload?.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.classList.add('dragover');
    });

    fileUpload?.addEventListener('dragleave', () => {
      fileUpload.classList.remove('dragover');
    });

    fileUpload?.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.classList.remove('dragover');
      const files = (e as DragEvent).dataTransfer?.files;
      if (files) {
        this.handleFiles(Array.from(files), shadowRoot);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        this.handleFiles(Array.from(files), shadowRoot);
      }
    });

    // Keyboard handling for accessibility
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Handle keyboard events for accessibility
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (!this.modal) return;

    if (e.key === 'Escape') {
      this.handleCancel();
    }

    // Trap focus within modal
    if (e.key === 'Tab') {
      const shadowRoot = this.modal.shadowRoot;
      if (!shadowRoot) return;

      const focusableElements = shadowRoot.querySelectorAll(
        'button, input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  /**
   * Handle file selection
   */
  private handleFiles(files: File[], shadowRoot: ShadowRoot): void {
    const uploadedFilesContainer = shadowRoot.querySelector('.uploaded-files');
    if (!uploadedFilesContainer) return;

    // Validate files
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length !== files.length) {
      this.showError('Some files were skipped. Only PDF, DOC, DOCX, and TXT files under 10MB are allowed.', shadowRoot);
    }

    // Display files
    validFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-info">
          <div class="file-icon">📄</div>
          <div>
            <div class="file-name">${this.escapeHtml(file.name)}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button class="remove-file" data-filename="${file.name}">Remove</button>
      `;

      const removeButton = fileItem.querySelector('.remove-file');
      removeButton?.addEventListener('click', () => {
        fileItem.remove();
        this.removeFile(file.name);
      });

      uploadedFilesContainer.appendChild(fileItem);
    });

    // Store files for upload
    this.uploadedFiles.push(...validFiles);
  }

  /**
   * Remove file from uploaded files
   */
  private removeFile(filename: string): void {
    this.uploadedFiles = this.uploadedFiles.filter(file => file.name !== filename);
  }

  /**
   * Handle cancel action
   */
  private handleCancel(): void {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    this.hide();
    this.options.onCancel();
  }

  /**
   * Handle regenerate action
   */
  private async handleRegenerate(): Promise<void> {
    if (!this.modal?.shadowRoot) return;

    const shadowRoot = this.modal.shadowRoot;
    const regenerateButton = shadowRoot.querySelector('[data-action="regenerate"]') as HTMLButtonElement;
    const buttonText = shadowRoot.querySelector('.btn-text');
    const spinner = shadowRoot.querySelector('.loading-spinner') as HTMLElement;
    const contextText = (shadowRoot.querySelector('#context-text') as HTMLTextAreaElement)?.value || '';

    if (!contextText.trim() && this.uploadedFiles.length === 0) {
      this.showError('Please provide either text context or upload documents to enhance the suggestion.', shadowRoot);
      return;
    }

    // Show loading state
    regenerateButton.disabled = true;
    if (buttonText) buttonText.textContent = 'Regenerating...';
    spinner.style.display = 'block';

    try {
      // Upload files if any
      let documentContext = '';
      if (this.uploadedFiles.length > 0) {
        documentContext = await this.uploadAndProcessDocuments(this.uploadedFiles);
      }

      // Combine text and document context
      const combinedContext = [contextText, documentContext].filter(Boolean).join('\n\n');

      // Note: getEnhancedSuggestion has been removed in favor of formId-based workflow
      // For now, create an enhanced suggestion using the combined context
      const enhancedSuggestion = {
        value: combinedContext || this.options.currentSuggestion.value,
        source: `${this.options.currentSuggestion.source} (Enhanced)`,
        confidence: Math.min(this.options.currentSuggestion.confidence + 10, 100),
        fieldType: this.options.currentSuggestion.fieldType,
        fieldName: this.options.currentSuggestion.fieldName
      };

      // Return enhanced suggestion
      this.options.onEnhancedSuggestion(enhancedSuggestion);
      
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
      this.hide();

    } catch (error) {
      console.error('Error regenerating suggestion:', error);
      this.showError('Failed to regenerate suggestion. Please try again.', shadowRoot);
    } finally {
      // Reset loading state
      regenerateButton.disabled = false;
      if (buttonText) buttonText.textContent = 'Regenerate Suggestion';
      spinner.style.display = 'none';
    }
  }

  /**
   * Upload and process documents
   */
  private async uploadAndProcessDocuments(files: File[]): Promise<string> {
    // Create FormData for file upload
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));

    try {
      const response = await this.apiService.uploadContextDocuments(formData);
      return response.extractedText || '';
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw new Error('Failed to process uploaded documents');
    }
  }

  /**
   * Show error message
   */
  private showError(message: string, shadowRoot: ShadowRoot): void {
    const errorElement = shadowRoot.querySelector('.error-message');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
      
      // Hide after 5 seconds
      setTimeout(() => {
        errorElement.classList.remove('show');
      }, 5000);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 