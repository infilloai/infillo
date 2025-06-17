/**
 * Background Script for InfilloAI Extension
 * Handles authentication, context menus, and cross-tab communication
 */
// @ts-nocheck

import { ChromeAuthService } from '../utils/chromeAuth';
import { ExtensionStorage } from '../utils/storage';
import { API_BASE_URL, WEB_APP_URL } from '../config/config';

class BackgroundScript {
  private authService: ChromeAuthService;
  private lastAuthState: boolean = false;
  
  constructor() {
    console.log('🔵 Background script: Constructor called');
    this.authService = ChromeAuthService.getInstance();
    
    // Setup message listeners FIRST and synchronously
    // This ensures they're always available even if other initialization fails
    this.setupMessageListeners();
    console.log('🔵 Background script: Message listeners setup complete');
    
    // Then do async initialization
    this.initializeAsync().catch(error => {
      console.error('❌ Background script: Async initialization failed:', error);
      // Don't crash the background script - message listeners are still working
    });
  }

  private async initializeAsync(): Promise<void> {
    try {
      console.log('🔵 Background script: Starting async initialization...');
    
    // Setup auth state monitoring
    this.setupAuthStateMonitoring();
    console.log('🔵 Background script: Auth state monitoring setup complete');
    
      // Initial auth check (non-blocking)
      try {
    await this.updateAuthState();
    console.log('🔵 Background script: Initial auth check complete');
      } catch (authError) {
        console.error('⚠️ Background script: Initial auth check failed:', authError);
        // Continue with other initialization
      }
      
      // Setup context menus (non-blocking)
      try {
        await this.setupContextMenus();
        console.log('🔵 Background script: Context menus setup complete');
      } catch (menuError) {
        console.error('⚠️ Background script: Context menu setup failed:', menuError);
        // Continue - this is not critical for message handling
      }
      
      console.log('✅ InfilloAI background script async initialization completed');
    } catch (error) {
      console.error('❌ Background script: Async initialization error:', error);
      // Don't re-throw - keep the background script alive
    }
  }

  /**
   * Setup message listeners for various communications
   */
  private setupMessageListeners(): void {
    try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🔵 Background script: Received message:', message.type, message);
      
      switch (message.type) {
          case 'PING':
            // Simple test message to verify background script is working
            console.log('🔵 Background script: PING received');
            sendResponse({ success: true, message: 'Background script is alive' });
            return false;
        case 'GET_AUTH_STATE':
          this.handleGetAuthState(sendResponse).catch(error => {
            console.error('❌ Background script: GET_AUTH_STATE handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling auth state request' });
          });
          return true; // Keep channel open for async response

        case 'GET_AUTH_DATA':
          this.handleGetAuthData(sendResponse).catch(error => {
            console.error('❌ Background script: GET_AUTH_DATA handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling auth data request' });
          });
          return true; // Keep channel open for async response

        case 'REQUEST_AUTH_TRANSFER':
          this.handleRequestAuthTransfer(sendResponse).catch(error => {
            console.error('❌ Background script: REQUEST_AUTH_TRANSFER handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling transfer request' });
          });
          return true; // Keep channel open for async response

        case 'INITIATE_AUTH':
          this.handleInitiateAuth(sendResponse).catch(error => {
            console.error('❌ Background script: INITIATE_AUTH handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling auth initiation' });
          });
          return true;

        case 'BACKGROUND_OAUTH':
          console.log('🔵 Background script: Handling BACKGROUND_OAUTH');
          this.handleBackgroundOAuth(sendResponse).catch(error => {
            console.error('❌ Background script: BACKGROUND_OAUTH handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling OAuth' });
          });
          return true;

        case 'LOGOUT':
          this.handleLogout(message.logoutAll, sendResponse).catch(error => {
            console.error('❌ Background script: LOGOUT handler failed:', error);
            sendResponse({ success: false, error: 'Internal error handling logout' });
          });
          return true;

        case 'AUTH_STATE_CHANGED':
          this.handleAuthStateChanged(message.data);
          return false;

        case 'WEB_AUTH_STATE_UPDATE':
          this.handleWebAuthStateUpdate(message.authData);
          return false;

        case 'WEB_AUTH_LOGOUT':
          this.handleWebAuthLogout();
          return false;

        case 'AUTH_SUCCESS':
          this.handleAuthSuccess(message.data, sender);
          return false;

        case 'AUTH_ERROR':
          this.handleAuthError(message.error);
          return false;

        case 'OPEN_POPUP_FOR_AUTH':
          this.handleOpenPopupForAuth(message.source, sendResponse).catch(error => {
            console.error('❌ Background script: OPEN_POPUP_FOR_AUTH handler failed:', error);
            sendResponse({ success: false, error: 'Internal error opening popup' });
          });
          return true;

        case 'DEBUG_LOG':
          console.log('🔍 POPUP DEBUG:', message.data);
          return false;

        case 'CHECK_ORIGIN_BLOCKED':
          this.handleCheckOriginBlocked(message.origin, sendResponse).catch(error => {
            console.error('❌ Background script: CHECK_ORIGIN_BLOCKED handler failed:', error);
            sendResponse({ success: false, error: 'Internal error checking blocked origin' });
          });
          return true;

        case 'ORIGIN_BLOCK_STATUS_CHANGED':
          this.notifyOriginBlockStatusChange(message.origin, message.isBlocked).catch(error => {
            console.error('❌ Background script: ORIGIN_BLOCK_STATUS_CHANGED handler failed:', error);
          });
          sendResponse({ success: true });
          return false;

        default:
          console.log('🔴 Background script: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
          return false;
      }
    });

    // Handle external messages from web app
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
        console.log('🔵 Background script: Received external message:', message.type, 'from:', sender.origin);
        
      // Verify sender origin
      if (!this.isAllowedOrigin(sender.origin)) {
          console.warn('🔴 Background script: Rejected message from unauthorized origin:', sender.origin);
        return false;
      }

      switch (message.type) {
        case 'EXTENSION_AUTH_REQUEST':
          this.handleExternalAuthRequest(sendResponse);
          return true;

        case 'EXTENSION_AUTH_SUCCESS':
          this.handleExternalAuthSuccess(message.data);
          return false;

        default:
            console.log('🔴 Background script: Unknown external message type:', message.type);
          return false;
      }
    });
      
      console.log('✅ Background script: Message listeners setup successfully');
    } catch (error) {
      console.error('❌ Background script: Failed to setup message listeners:', error);
      throw error; // This is critical - if message listeners fail, the extension won't work
    }
  }

  /**
   * Check if origin is allowed for external communication
   */
  private isAllowedOrigin(origin: string | undefined): boolean {
    const allowedOrigins = [
      WEB_APP_URL, // Web app
      API_BASE_URL, // Backend API
    ];
    return origin ? allowedOrigins.includes(origin) : false;
  }

  /**
   * Setup authentication state monitoring
   */
  private setupAuthStateMonitoring(): void {
    // Reduced frequency since auth service now handles proactive refresh
    // Background script just does periodic health checks
    setInterval(async () => {
      await this.performHealthCheck();
    }, 120000); // Check every 2 minutes (reduced from 1 minute)

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.authData) {
        this.updateAuthState();
      }
    });

    console.log('✅ Background auth monitoring setup - health checks every 2 minutes');
  }

  /**
   * Perform auth health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      
      if (isAuthenticated !== this.lastAuthState) {
        console.log(`🔄 Auth state changed: ${this.lastAuthState} → ${isAuthenticated}`);
        this.lastAuthState = isAuthenticated;
        await this.updateBadgeAndContextMenu();
      }

      // Get session health for debugging
      if (isAuthenticated) {
        const health = await this.authService.getSessionHealth();
        console.log(`💊 Session health: ${health.lifetimeProgress.toFixed(2)*100}% used, ${Math.round(health.timeRemaining/1000/60)}min remaining, refresh needed: ${health.needsRefresh}`);
        
        // Update badge with session status
        if (health.needsRefresh) {
          chrome.action.setBadgeText({ text: '🔄' });
          chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
          chrome.action.setTitle({ title: 'InfilloAI - Session refreshing...' });
        } else if (health.timeRemaining < 5 * 60 * 1000) { // Less than 5 minutes
          chrome.action.setBadgeText({ text: '⚠️' });
          chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
          chrome.action.setTitle({ title: 'InfilloAI - Session expiring soon' });
        } else {
          chrome.action.setBadgeText({ text: '' });
          chrome.action.setTitle({ title: 'InfilloAI - Authenticated' });
        }
      }
    } catch (error) {
      console.error('🔴 Health check failed:', error);
    }
  }

  /**
   * Handle get authentication state request
   */
  private async handleGetAuthState(sendResponse: (response: any) => void): Promise<void> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      const user = isAuthenticated ? await this.authService.getCurrentUser() : null;
      
      sendResponse({
        success: true,
        data: {
          isAuthenticated,
          user,
        },
      });
    } catch (error) {
      console.error('Error getting auth state:', error);
      sendResponse({
        success: false,
        error: 'Failed to get authentication state',
      });
    }
  }

  /**
   * Handle get full authentication data request (including tokens)
   */
  private async handleGetAuthData(sendResponse: (response: any) => void): Promise<void> {
    try {
      const authData = await ExtensionStorage.getAuthData();
      
      if (authData) {
        sendResponse({
          success: true,
          data: authData,
        });
      } else {
        sendResponse({
          success: true,
          data: null,
        });
      }
    } catch (error) {
      console.error('Error getting auth data:', error);
      sendResponse({
        success: false,
        error: 'Failed to get authentication data',
      });
    }
  }

  /**
   * Handle request for secure auth transfer to web app
   */
  private async handleRequestAuthTransfer(sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('🔵 Background: Processing auth transfer request...');

      // Check if user is authenticated
      const isAuthenticated = await this.authService.isAuthenticated();
      console.log('🔵 Background: User authenticated?', isAuthenticated);
      
      if (!isAuthenticated) {
        console.error('❌ Background: User not authenticated');
        sendResponse({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Get valid access token
      const accessToken = await this.authService.getValidAccessToken();
      console.log('🔵 Background: Access token available?', !!accessToken);
      
      if (!accessToken) {
        console.error('❌ Background: No valid access token available');
        sendResponse({
          success: false,
          error: 'No valid access token available',
        });
        return;
      }

      // Make API request to store transfer data
      const endpoint = `${API_BASE_URL}/api/auth/transfer/store`;
      console.log('🔵 Background: Making API request to:', endpoint);
      console.log('🔵 Background: Using access token:', accessToken.substring(0, 20) + '...');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔵 Background: API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Background: Failed to store transfer data:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        sendResponse({
          success: false,
          error: `Server error: ${response.status} - ${errorText}`,
        });
        return;
      }

      const result = await response.json();
      console.log('🔵 Background: API result:', result);
      
              if (result.success) {
          console.log('✅ Background: Transfer data stored successfully:', result.data.transferId);
          console.log('🔍 Background: Full result data:', result.data);
          
          // Log this to Chrome's extension console so we can see it
          chrome.action.setBadgeText({ text: '✓' });
          chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
          chrome.action.setTitle({ title: `InfilloAI - Transfer: ${result.data.transferId.substring(0, 8)}...` });
          
          sendResponse({
            success: true,
            data: result.data,
          });
        } else {
          console.error('❌ Background: Server returned error:', result.error);
          console.error('🔍 Background: Full error result:', result);
          
          // Show error in badge
          chrome.action.setBadgeText({ text: '✗' });
          chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
          chrome.action.setTitle({ title: `InfilloAI - Transfer Error: ${result.error}` });
          
          sendResponse({
            success: false,
            error: result.error || 'Failed to store transfer data',
          });
        }

    } catch (error) {
      console.error('❌ Error handling auth transfer request:', error);
      sendResponse({
        success: false,
        error: 'Failed to process transfer request',
      });
    }
  }

  /**
   * Handle initiate authentication request
   */
  private async handleInitiateAuth(sendResponse: (response: any) => void): Promise<void> {
    try {
      await this.authService.authenticateUser();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error initiating authentication:', error);
      sendResponse({
        success: false,
        error: 'Failed to initiate authentication',
      });
    }
  }

  /**
   * Handle logout request
   */
  private async handleLogout(_logoutAll: boolean, sendResponse: (response: any) => void): Promise<void> {
    try {
      await this.authService.logout();
      await this.updateAuthState();
          sendResponse({ success: true });
    } catch (error) {
      console.error('Error during logout:', error);
      sendResponse({
        success: false,
        error: 'Failed to logout',
      });
    }
  }

  /**
   * Handle authentication state change notification
   */
  private async handleAuthStateChanged(data: { isAuthenticated: boolean }): Promise<void> {
    this.lastAuthState = data.isAuthenticated;
    await this.updateBadgeAndContextMenu();
    
    // Notify all tabs about auth state change
    this.notifyTabsAuthStateChange(data.isAuthenticated);
          }

  /**
   * Handle web app authentication state update
   */
  private async handleWebAuthStateUpdate(authData: any): Promise<void> {
    try {
      // Only import if extension doesn't have current auth
      const isCurrentlyAuthenticated = await this.authService.isAuthenticated();
      
      if (!isCurrentlyAuthenticated && authData) {
        // Verify token before importing
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${authData.accessToken}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          
          await ExtensionStorage.setAuthData({
            user: result.data.user,
            tokens: {
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              expiresAt: authData.expiresAt,
            },
          });

          await this.updateAuthState();
          console.log('Successfully imported auth from web app');
        }
      }
    } catch (error) {
      console.error('Error handling web auth state update:', error);
    }
  }

  /**
   * Handle check if origin is blocked
   */
  private async handleCheckOriginBlocked(origin: string, sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('🔍 Background: Checking if origin is blocked:', {
        origin,
        timestamp: new Date().toISOString()
      });
      
      // Get valid access token
      const accessToken = await this.authService.getValidAccessToken();
      console.log('🔍 Background: Access token available:', !!accessToken);
      
      if (!accessToken) {
        console.log('🔍 Background: No access token, origin not blocked (not authenticated)');
        sendResponse({
          success: true,
          data: { isBlocked: false, origin }
        });
        return;
      }

      // Make API request to check blocked status
      const endpoint = `${API_BASE_URL}/api/blocked-origins/check?origin=${encodeURIComponent(origin)}`;
      console.log('🔍 Background: Making API request to:', {
        endpoint,
        encodedOrigin: encodeURIComponent(origin),
        authHeader: `Bearer ${accessToken.substring(0, 20)}...`
      });
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Background: API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Background: Failed to check blocked origin:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        // If API fails, assume not blocked
        sendResponse({
          success: true,
          data: { isBlocked: false, origin }
        });
        return;
      }

      const result = await response.json();
      console.log('🔍 Background: Blocked origin check result:', {
        fullResult: result,
        success: result.success,
        isBlocked: result.data?.isBlocked,
        origin: result.data?.origin
      });
      
      if (result.success) {
        console.log('✅ Background: Sending response:', {
          isBlocked: result.data.isBlocked,
          origin
        });
        sendResponse({
          success: true,
          data: { isBlocked: result.data.isBlocked, origin }
        });
      } else {
        console.warn('⚠️ Background: API returned error, assuming not blocked:', result);
        // If API returns error, assume not blocked
        sendResponse({
          success: true,
          data: { isBlocked: false, origin }
        });
      }

    } catch (error) {
      console.error('❌ Background: Error checking blocked origin:', {
        error: error.message,
        stack: error.stack,
        origin
      });
      // If check fails, assume not blocked to avoid breaking form detection
      sendResponse({
        success: true,
        data: { isBlocked: false, origin }
      });
    }
  }

  /**
   * Notify all content scripts about origin block status change
   */
  private async notifyOriginBlockStatusChange(origin: string, isBlocked: boolean): Promise<void> {
    try {
      console.log('📢 Background: Notifying tabs about origin block status change:', { origin, isBlocked });
      
      const tabs = await chrome.tabs.query({});
      console.log('📢 Background: Found', tabs.length, 'tabs to check');
      
      let notifiedCount = 0;
      let errorCount = 0;
      
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          try {
            const tabOrigin = new URL(tab.url).origin;
            console.log('📢 Background: Checking tab', tab.id, 'with origin:', tabOrigin, 'against target:', origin);
            
            if (tabOrigin === origin) {
              console.log('📢 Background: Notifying tab', tab.id, 'about block status change');
              
              const message = {
                type: 'ORIGIN_BLOCK_STATUS_CHANGED',
                data: { origin, isBlocked }
              };
              
              console.log('📢 Background: Sending message:', message);
              
              try {
                const response = await chrome.tabs.sendMessage(tab.id, message);
                console.log('📢 Background: Message sent successfully to tab', tab.id, 'response:', response);
                notifiedCount++;
              } catch (messageError) {
                console.error('❌ Background: Failed to send message to tab', tab.id, ':', messageError);
                console.error('❌ Background: Error details:', {
                  error: messageError,
                  tabId: tab.id,
                  tabUrl: tab.url,
                  message
                });
                errorCount++;
              }
            } else {
              console.log('📢 Background: Tab', tab.id, 'origin does not match, skipping');
            }
          } catch (urlError) {
            console.log('📢 Background: Skipping tab', tab.id, 'with invalid URL:', tab.url);
            // Skip tabs with invalid URLs (like chrome:// or extension pages)
            continue;
          }
        } else {
          console.log('📢 Background: Skipping tab without ID or URL:', tab);
        }
      }
      
      console.log('📢 Background: Notification summary:', {
        totalTabs: tabs.length,
        notifiedCount,
        errorCount,
        origin,
        isBlocked
      });
      
    } catch (error) {
      console.error('❌ Background: Error notifying tabs about origin block status change:', error);
    }
  }

  /**
   * Handle web app logout
   */
  private async handleWebAuthLogout(): Promise<void> {
    try {
      await ExtensionStorage.clearAuthData();
      await this.updateAuthState();
      console.log('Logged out due to web app logout');
    } catch (error) {
      console.error('Error handling web auth logout:', error);
    }
  }

  /**
   * Handle authentication success from web app
   */
  private async handleAuthSuccess(data: any, sender: chrome.runtime.MessageSender): Promise<void> {
    try {
      const { accessToken, refreshToken, user } = data;
      
      // Parse JWT to get expiry
      const tokenPayload = this.parseJWT(accessToken);
      const expiresAt = tokenPayload?.exp ? tokenPayload.exp * 1000 : Date.now() + 15 * 60 * 1000;

      await ExtensionStorage.setAuthData({
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresAt,
        },
      });

      await this.updateAuthState();
      
      // Close the auth tab if it was opened by the extension
      if (sender.tab?.id) {
        const tabId = sender.tab.id;
        setTimeout(() => {
          // @ts-ignore - Chrome API types issue
          chrome.tabs.remove(tabId).catch(() => {
            // Tab might already be closed
          });
        }, 2000);
      }
      
      console.log('Authentication successful');
    } catch (error) {
      console.error('Error handling auth success:', error);
    }
  }

  /**
   * Handle open popup for authentication request
   */
  private async handleOpenPopupForAuth(source: string, sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log(`🚀 Background: Opening extension popup for authentication (source: ${source})`);
      
      // Strategy 1: Use chrome.action.openPopup() if available (Chrome 99+)
      if (chrome.action && chrome.action.openPopup) {
        try {
          await chrome.action.openPopup();
          console.log('✅ Background: Successfully opened extension popup directly');
          sendResponse({ success: true, method: 'direct_popup' });
          return;
        } catch (directError) {
          console.warn('⚠️ Background: Direct popup failed:', directError);
          // Continue to fallback methods
        }
      }
      
      // Strategy 2: Create a new tab with the extension popup URL
      try {
        const extensionUrl = chrome.runtime.getURL('popup.html');
        const tab = await chrome.tabs.create({
          url: extensionUrl,
          active: true
        });
        
        console.log('✅ Background: Opened extension in new tab:', tab.id);
        sendResponse({ success: true, method: 'new_tab', tabId: tab.id });
        return;
      } catch (tabError) {
        console.error('❌ Background: Failed to open extension in new tab:', tabError);
      }
      
      // Strategy 3: Focus extension popup if already open
      try {
        const tabs = await chrome.tabs.query({ 
          url: chrome.runtime.getURL('popup.html')
        });
        
        if (tabs.length > 0) {
          const firstTab = tabs[0];
          if (firstTab?.id && firstTab?.windowId) {
            const tabId = firstTab.id;
            const windowId = firstTab.windowId;
            
            await chrome.tabs.update(tabId, { active: true });
            await chrome.windows.update(windowId, { focused: true });
            
            console.log('✅ Background: Focused existing extension tab');
            sendResponse({ success: true, method: 'focus_existing' });
            return;
          }
        }
      } catch (focusError) {
        console.warn('⚠️ Background: Failed to focus existing tab:', focusError);
      }
      
      // All strategies failed
      console.error('❌ Background: All popup opening strategies failed');
      sendResponse({ 
        success: false, 
        error: 'Failed to open extension popup', 
        fallback: true 
      });
      
    } catch (error) {
      console.error('❌ Background: Error in handleOpenPopupForAuth:', error);
      sendResponse({ 
        success: false, 
        error: 'Internal error opening popup' 
      });
    }
  }

  /**
   * Handle authentication error
   */
  private async handleAuthError(error: string): Promise<void> {
    console.error('Authentication failed:', error);
    await this.updateAuthState();
  }

  /**
   * Handle external authentication request from web app
   */
  private async handleExternalAuthRequest(sendResponse: (response: any) => void): Promise<void> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      const user = isAuthenticated ? await this.authService.getCurrentUser() : null;
      
      sendResponse({
        success: true,
        data: {
          isAuthenticated,
          user,
          extensionId: chrome.runtime.id,
        },
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: 'Failed to get extension auth state',
      });
    }
  }

  /**
   * Handle external authentication success from web app
   */
  private async handleExternalAuthSuccess(data: any): Promise<void> {
    try {
      await this.handleAuthSuccess(data, { tab: undefined } as chrome.runtime.MessageSender);
    } catch (error) {
      console.error('Error handling external auth success:', error);
    }
  }

  /**
   * Notify all tabs about authentication state changes
   */
  private async notifyTabsAuthStateChange(isAuthenticated: boolean): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'EXTENSION_AUTH_STATE_CHANGED',
              data: { isAuthenticated },
            });
          } catch (error) {
            // Tab might not have content script, that's okay
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error notifying tabs about auth state change:', error);
    }
  }

  /**
   * Update authentication state and UI elements
   */
  private async updateAuthState(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      
      if (isAuthenticated !== this.lastAuthState) {
        this.lastAuthState = isAuthenticated;
        await this.updateBadgeAndContextMenu();
        this.notifyTabsAuthStateChange(isAuthenticated);
      }
    } catch (error) {
      console.error('Error updating auth state:', error);
    }
  }

  /**
   * Update extension badge and context menu based on auth state
   */
  private async updateBadgeAndContextMenu(): Promise<void> {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      
      // Update badge
      if (isAuthenticated) {
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
        chrome.action.setTitle({ title: 'InfilloAI - Signed In' });
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
        chrome.action.setTitle({ title: 'InfilloAI - Sign In Required' });
      }

      // Update context menus
      await this.setupContextMenus();
    } catch (error) {
      console.error('Error updating badge and context menu:', error);
    }
  }

  /**
   * Setup context menus based on authentication state
   */
  private async setupContextMenus(): Promise<void> {
    try {
      // Remove all existing context menus
      await chrome.contextMenus.removeAll();

      const isAuthenticated = await this.authService.isAuthenticated();

      if (isAuthenticated) {
        // Authenticated context menus
        chrome.contextMenus.create({
          id: 'fill-form',
          title: 'Fill with InfilloAI',
          contexts: ['editable'],
        });

        chrome.contextMenus.create({
          id: 'auto-fill-page',
          title: 'Auto-fill entire page',
          contexts: ['page'],
        });

        chrome.contextMenus.create({
          id: 'separator1',
          type: 'separator',
          contexts: ['page', 'editable'],
        });

        chrome.contextMenus.create({
          id: 'open-information-records',
          title: 'Open Information Records',
          contexts: ['page', 'editable'],
        });
      } else {
        // Unauthenticated context menus
        chrome.contextMenus.create({
          id: 'sign-in',
          title: 'Sign in to InfilloAI',
          contexts: ['page', 'editable'],
        });
      }

      // Handle context menu clicks
      chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
        switch (info.menuItemId) {
          case 'fill-form':
            // TODO: Implement form filling
            console.log('Fill form clicked');
            break;

          case 'auto-fill-page':
            // TODO: Implement page auto-fill
            console.log('Auto-fill page clicked');
            break;

          case 'open-information-records':
            await chrome.tabs.create({ url: `${WEB_APP_URL}/information-records` });
            break;

          case 'sign-in':
            await this.authService.authenticateUser();
            break;
        }
      });
    } catch (error) {
      console.error('Error setting up context menus:', error);
    }
  }

  /**
   * Parse JWT token (client-side only, not for verification)
   */
  private parseJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new Error('Invalid JWT format');
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  /**
   * Handle background OAuth authentication (keeps popup open)
   */
  private async handleBackgroundOAuth(sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('🔵 Background script: Starting OAuth authentication...');
      
      // Step 1: Get Google OAuth token
      const token = await this.getGoogleAuthTokenInBackground();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      console.log('🔵 Background script: Got Google token, exchanging with backend...');
      
      // Step 2: Exchange token with backend
      const authData = await this.exchangeTokenWithBackend(token);
      if (!authData) {
        throw new Error('Failed to exchange token with backend');
      }
      
      console.log('🔵 Background script: Storing auth data...');
      
      // Step 3: Store authentication data
      await ExtensionStorage.setAuthData(authData);
      
      // Step 4: Update auth state
      await this.updateAuthState();
      
      console.log('✅ Background script: Authentication successful');
      
      sendResponse({ 
        success: true, 
        data: { 
          user: authData.user,
          isAuthenticated: true 
        } 
      });
    } catch (error) {
      console.error('❌ Background script: Authentication failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  /**
   * Get Google OAuth token in background (won't close popup)
   */
  private async getGoogleAuthTokenInBackground(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      console.log('🔵 Background script: Calling chrome.identity.getAuthToken...');
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Background script: Chrome Identity API error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!token) {
          console.error('❌ Background script: No token received from Chrome Identity API');
          reject(new Error('No token received'));
          return;
        }
        
        console.log('✅ Background script: Chrome Identity API token received');
        resolve(token);
      });
    });
  }

  /**
   * Exchange Google token with backend
   */
  private async exchangeTokenWithBackend(googleToken: string): Promise<any> {
    try {
      // Get user info from Google API
      const userInfo = await this.getUserInfoFromGoogle(googleToken);
      if (!userInfo) {
        throw new Error('Failed to get user info from Google');
      }

      // Exchange with our backend
      const response = await fetch(`${API_BASE_URL}/api/auth/google/extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleToken: googleToken,
          userInfo: userInfo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend exchange failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Backend exchange failed');
      }

      const { user, tokens } = result.data;
      
      return {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt || Date.now() + 15 * 60 * 1000,
        },
      };
    } catch (error) {
      console.error('❌ Background script: Error exchanging token with backend:', error);
      return null;
    }
  }

  /**
   * Get user info from Google API
   */
  private async getUserInfoFromGoogle(token: string): Promise<any> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info from Google: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Background script: Error getting user info from Google:', error);
      return null;
    }
  }
}

// Initialize background script
console.log('🔵 Background script: File loaded, creating BackgroundScript instance...');
new BackgroundScript();
console.log('🔵 Background script: BackgroundScript instance created'); 