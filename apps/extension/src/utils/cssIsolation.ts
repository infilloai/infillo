/**
 * CSS Isolation Utility for Chrome Extension
 * Uses Shadow DOM to completely isolate extension styles from webpage styles
 */

export interface IsolatedElementOptions {
  id?: string;
  className?: string;
  styles?: string;
  adoptGlobalStyles?: boolean;
}

export class CSSIsolation {
  private static readonly EXTENSION_PREFIX = 'infilloai-ext';

  /**
   * Creates an isolated container using Shadow DOM
   */
  static createIsolatedContainer(options: IsolatedElementOptions = {}): {
    container: HTMLElement;
    shadowRoot: ShadowRoot;
  } {
    console.log('🔧 CSSIsolation: createIsolatedContainer() called with options:', options);
    
    const container = document.createElement('div');
    container.id = options.id || this.generateUniqueId();
    container.className = options.className || `${this.EXTENSION_PREFIX}-container`;
    
    console.log('🔧 CSSIsolation: Container created:', {
      id: container.id,
      className: container.className,
      tagName: container.tagName
    });
    
    // Create shadow root for complete isolation
    const shadowRoot = container.attachShadow({ mode: 'closed' });
    console.log('🔧 CSSIsolation: Shadow root created:', shadowRoot);
    
    // Add base styles for isolation
    const baseStyles = this.getBaseIsolationStyles();
    if (options.styles) {
      console.log('🔧 CSSIsolation: Injecting custom styles...');
      this.injectStyles(shadowRoot, baseStyles + options.styles);
    } else {
      console.log('🔧 CSSIsolation: Injecting base styles only...');
      this.injectStyles(shadowRoot, baseStyles);
    }

    console.log('🔧 CSSIsolation: Isolated container ready:', { container, shadowRoot });
    return { container, shadowRoot };
  }

  /**
   * Injects CSS styles into a shadow root
   */
  static injectStyles(shadowRoot: ShadowRoot, styles: string): void {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    shadowRoot.appendChild(styleElement);
  }

  /**
   * Gets base isolation styles that reset all possible inherited styles
   */
  private static getBaseIsolationStyles(): string {
    return `
      /* Prevent inheritance from parent page */
      :host {
        all: initial;
        display: block;
        contain: layout style paint size;
        isolation: isolate;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      /* Reset only problematic inherited properties, not all */
      * {
        box-sizing: border-box;
        font-family: inherit;
      }

      /* Base typography reset for text elements */
      div, span, p, h1, h2, h3, h4, h5, h6 {
        margin: 0;
        padding: 0;
        font-weight: inherit;
        font-size: inherit;
        line-height: inherit;
        color: inherit;
      }

      /* Input elements reset */
      input, button, textarea, select {
        font-family: inherit;
        font-size: inherit;
        margin: 0;
        padding: 0;
      }
    `;
  }

  /**
   * Generates a unique ID for extension elements
   */
  private static generateUniqueId(): string {
    return `${this.EXTENSION_PREFIX}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Safely removes an isolated container
   */
  static removeIsolatedContainer(container: HTMLElement): void {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  /**
   * Creates a scoped CSS class name
   */
  static scopeClassName(className: string): string {
    return `${this.EXTENSION_PREFIX}__${className}`;
  }

  /**
   * Checks if an element belongs to the extension
   */
  static isExtensionElement(element: Element): boolean {
    return element.id?.startsWith(this.EXTENSION_PREFIX) ||
           element.className?.includes(this.EXTENSION_PREFIX) ||
           !!element.closest(`[id^="${this.EXTENSION_PREFIX}"]`);
  }
} 