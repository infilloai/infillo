/**
 * Content Script for Web App Authentication Synchronization
 * Handles bidirectional auth state sync between extension and web app
 */

class AuthContentScript {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
    // Setup message listeners
    this.setupExtensionMessageListener();
    this.setupWebAppMessageListener();
    
      // Initial auth state check (non-blocking, with error handling)
      setTimeout(() => {
        this.checkAndSyncAuthState().catch(error => {
          console.log('🔴 AuthContent: Non-critical error during auth state check:', error);
          // Don't block the main content script for auth issues
        });
      }, 1000);
    } catch (error) {
      console.log('🔴 AuthContent: Non-critical error during initialization:', error);
      // Don't re-throw - this shouldn't block the main content script
    }
  }

  /**
   * Listen for messages from extension
   */
  private setupExtensionMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'GET_WEB_AUTH_STATE':
          this.handleGetWebAuthState(sendResponse);
          return true; // Keep channel open for async response

        case 'SET_WEB_AUTH_STATE':
          this.handleSetWebAuthState(message.authData);
          sendResponse({ success: true });
          return true;

        case 'CLEAR_WEB_AUTH_STATE':
          this.handleClearWebAuthState();
          sendResponse({ success: true });
          return true;

        default:
          return false;
      }
    });
  }

  /**
   * Listen for messages from web app (postMessage)
   */
  private setupWebAppMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      switch (event.data?.type) {
        case 'AUTH_STATE_CHANGED':
          this.syncAuthStateToExtension();
          break;

        case 'REQUEST_AUTH_SYNC':
          this.syncAuthStateToExtension();
          break;

        default:
          break;
      }
    });
  }

  /**
   * Handle request for web app auth state from extension
   */
  private handleGetWebAuthState(sendResponse: (response: any) => void): void {
    try {
      const authData = this.getWebAppAuthData();
      
      if (authData) {
        sendResponse({
          success: true,
          authData: authData,
        });
      } else {
        sendResponse({
          success: false,
          error: 'No authentication data found',
        });
      }
    } catch (error) {
      console.error('Error getting web auth state:', error);
      sendResponse({
        success: false,
        error: 'Failed to get auth state',
      });
    }
  }

  /**
   * Handle setting web app auth state from extension
   */
  private handleSetWebAuthState(authData: any): void {
    try {
      this.setWebAppAuthData(authData);
      
      // Notify web app about auth state change
      window.postMessage({
        type: 'EXTENSION_AUTH_UPDATE',
        authData: authData,
      }, window.location.origin);
      
      // Trigger a page refresh or navigation if needed
      if (window.location.pathname === '/auth') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error setting web auth state:', error);
    }
  }

  /**
   * Handle clearing web app auth state
   */
  private handleClearWebAuthState(): void {
    try {
      this.clearWebAppAuthData();
      
      // Notify web app about logout
      window.postMessage({
        type: 'EXTENSION_AUTH_LOGOUT',
      }, window.location.origin);
      
      // Redirect to auth page if on protected routes
      if (this.isProtectedRoute()) {
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Error clearing web auth state:', error);
    }
  }

  /**
   * Get authentication data from web app localStorage
   */
  private getWebAppAuthData(): any {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userStr = localStorage.getItem('user');
      const expiresAtStr = localStorage.getItem('expiresAt');

      if (!accessToken || !userStr) {
        return null;
      }

      const user = JSON.parse(userStr);
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : Date.now() + 15 * 60 * 1000;

      return {
        accessToken,
        refreshToken,
        expiresAt,
        user,
      };
    } catch (error) {
      console.error('Error reading web app auth data:', error);
      return null;
    }
  }

  /**
   * Set authentication data in web app localStorage
   */
  private setWebAppAuthData(authData: any): void {
    try {
      if (authData.accessToken) {
        localStorage.setItem('accessToken', authData.accessToken);
      }
      
      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }
      
      if (authData.expiresAt) {
        localStorage.setItem('expiresAt', authData.expiresAt.toString());
      }
      
      if (authData.user) {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
    } catch (error) {
      console.error('Error setting web app auth data:', error);
    }
  }

  /**
   * Clear authentication data from web app localStorage
   */
  private clearWebAppAuthData(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing web app auth data:', error);
    }
  }

  /**
   * Sync current web app auth state to extension
   */
  private async syncAuthStateToExtension(): Promise<void> {
    try {
      const authData = this.getWebAppAuthData();
      
      if (authData) {
        // Send auth data to extension with timeout and error handling
        chrome.runtime.sendMessage({
          type: 'WEB_AUTH_STATE_UPDATE',
          authData: authData,
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.log('🔴 AuthContent: Background script not available:', chrome.runtime.lastError.message);
            // Don't throw error - just log and continue
          }
        });
      } else {
        // Send logout signal to extension with timeout and error handling
        chrome.runtime.sendMessage({
          type: 'WEB_AUTH_LOGOUT',
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.log('🔴 AuthContent: Background script not available:', chrome.runtime.lastError.message);
            // Don't throw error - just log and continue
          }
        });
      }
    } catch (error) {
      console.log('🔴 AuthContent: Error syncing auth state to extension (non-critical):', error);
      // Don't re-throw - this shouldn't block content script
    }
  }

  /**
   * Check if current route is protected and requires authentication
   */
  private isProtectedRoute(): boolean {
    const protectedPaths = ['/information-records', '/profile', '/settings', '/'];
    const currentPath = window.location.pathname;
    
    // Check if current path is in protected paths (excluding auth page)
    return protectedPaths.includes(currentPath) && currentPath !== '/auth';
  }

  /**
   * Check and sync authentication state on page load
   */
  private async checkAndSyncAuthState(): Promise<void> {
    try {
      // If on auth page, check for authentication success
      if (window.location.pathname === '/auth') {
        const urlParams = new URLSearchParams(window.location.search);
        const authSource = urlParams.get('auth_source');
        
        if (authSource === 'extension') {
          // This is an extension-initiated auth flow
          this.handleExtensionAuthFlow();
        }
      } else {
        // Regular page, sync current auth state with extension
        await this.syncAuthStateToExtension();
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  }

  /**
   * Handle extension-initiated authentication flow
   */
  private handleExtensionAuthFlow(): void {
    // Listen for auth completion from web app
    const handleAuthComplete = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'AUTH_SUCCESS') {
        // Send auth success to extension with error handling
        chrome.runtime.sendMessage({
          type: 'AUTH_SUCCESS',
          data: event.data.data,
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.log('🔴 AuthContent: Background script not available for AUTH_SUCCESS:', chrome.runtime.lastError.message);
          }
        });
        
        window.removeEventListener('message', handleAuthComplete);
      } else if (event.data?.type === 'AUTH_ERROR') {
        // Send auth error to extension with error handling
        chrome.runtime.sendMessage({
          type: 'AUTH_ERROR',
          error: event.data.error,
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.log('🔴 AuthContent: Background script not available for AUTH_ERROR:', chrome.runtime.lastError.message);
          }
        });
        
        window.removeEventListener('message', handleAuthComplete);
      }
    };

    window.addEventListener('message', handleAuthComplete);

    // Also listen for direct localStorage changes
    const checkAuthSuccess = () => {
      const authData = this.getWebAppAuthData();
      
      if (authData) {
        chrome.runtime.sendMessage({
          type: 'AUTH_SUCCESS',
          data: {
            accessToken: authData.accessToken,
            refreshToken: authData.refreshToken,
            user: authData.user,
          },
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.log('🔴 AuthContent: Background script not available for localStorage AUTH_SUCCESS:', chrome.runtime.lastError.message);
          }
        });
        
        clearInterval(authCheckInterval);
      }
    };

    const authCheckInterval = setInterval(checkAuthSuccess, 1000);
    
    // Stop checking after 2 minutes
    setTimeout(() => {
      clearInterval(authCheckInterval);
      window.removeEventListener('message', handleAuthComplete);
    }, 120000);
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AuthContentScript();
  });
} else {
  new AuthContentScript();
}

// Also initialize on any navigation changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Reinitialize on navigation
    setTimeout(() => new AuthContentScript(), 100);
  }
}).observe(document, { subtree: true, childList: true });

export { AuthContentScript }; 