/**
 * Extension Authentication Service
 * Handles OAuth flow, token management, and authentication state
 */

import { ExtensionStorage } from './storage';
import { AuthTokens, User, AuthData, ApiResponse } from '../types/extension';
import { API_BASE_URL, WEB_APP_URL } from '../config/config';

export class ExtensionAuthService {
  private static instance: ExtensionAuthService;

  public static getInstance(): ExtensionAuthService {
    if (!ExtensionAuthService.instance) {
      ExtensionAuthService.instance = new ExtensionAuthService();
    }
    return ExtensionAuthService.instance;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await ExtensionStorage.isAuthenticated();
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await ExtensionStorage.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get valid access token
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await ExtensionStorage.getValidAccessToken();
      
      if (!accessToken) {
        const authData = await ExtensionStorage.getAuthData();
        if (authData) {
          // Try to refresh token
          const newTokens = await this.refreshAccessToken(authData.tokens.refreshToken);
          if (newTokens) {
            const updatedAuthData: AuthData = {
              user: authData.user,
              tokens: newTokens,
            };
            await ExtensionStorage.setAuthData(updatedAuthData);
            return newTokens.accessToken;
          }
        }
        return null;
      }

      return accessToken;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Initiate Google OAuth authentication
   * Opens web app in new tab for OAuth flow
   */
  async initiateAuthentication(): Promise<void> {
    try {
      // Store the extension origin for callback validation
      await chrome.storage.local.set({
        'auth_origin': chrome.runtime.id,
        'auth_timestamp': Date.now(),
      });

      // Create new tab with web app auth page
      const authUrl = `${WEB_APP_URL}/auth?auth_source=extension&extension_id=${chrome.runtime.id}`;
      
      await chrome.tabs.create({
        url: authUrl,
        active: true,
      });

      // Listen for auth completion message from web app
      this.setupAuthMessageListener();
    } catch (error) {
      console.error('Error initiating authentication:', error);
      throw error;
    }
  }

  /**
   * Setup message listener for auth completion
   */
  private setupAuthMessageListener(): void {
    const handleMessage = async (message: any, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'AUTH_SUCCESS' && message.data) {
        try {
          const { accessToken, refreshToken, user } = message.data;
          
          // Parse JWT to get expiry
          const tokenPayload = this.parseJWT(accessToken);
          const expiresAt = tokenPayload?.exp ? tokenPayload.exp * 1000 : Date.now() + 15 * 60 * 1000;

          const authData: AuthData = {
            user,
            tokens: {
              accessToken,
              refreshToken,
              expiresAt,
            },
          };

          await ExtensionStorage.setAuthData(authData);
          
          // Clean up auth session data
          await chrome.storage.local.remove(['auth_origin', 'auth_timestamp']);
          
          // Notify popup or other components
          this.notifyAuthChange(true);
          
          // Close the auth tab
          if (sender.tab?.id) {
            await chrome.tabs.remove(sender.tab.id);
          }
        } catch (error) {
          console.error('Error handling auth success:', error);
        }
      } else if (message.type === 'AUTH_ERROR') {
        console.error('Authentication failed:', message.error);
        await chrome.storage.local.remove(['auth_origin', 'auth_timestamp']);
        this.notifyAuthChange(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const result: ApiResponse<{ tokens: AuthTokens; user: User }> = await response.json();
      
      if (result.success && result.data) {
        return result.data.tokens;
      }

      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    return fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
  }

  /**
   * Logout user
   */
  async logout(logoutAll = false): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (accessToken) {
        const endpoint = logoutAll ? '/api/auth/logout-all' : '/api/auth/logout';
        
        await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }

      await ExtensionStorage.clearAuthData();
      this.notifyAuthChange(false);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      await ExtensionStorage.clearAuthData();
      this.notifyAuthChange(false);
      return true;
    }
  }

  /**
   * Get current user profile from API
   */
  async fetchCurrentUser(): Promise<User | null> {
    try {
      const response = await this.authenticatedFetch('/api/auth/me');

      if (!response.ok) {
        if (response.status === 401) {
          await ExtensionStorage.clearAuthData();
          this.notifyAuthChange(false);
        }
        return null;
      }

      const result: ApiResponse<{ user: User }> = await response.json();
      
      if (result.success && result.data) {
        const { user } = result.data;
        
        // Update stored user data
        const authData = await ExtensionStorage.getAuthData();
        if (authData) {
          await ExtensionStorage.setAuthData({
            ...authData,
            user,
          });
        }
        
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Notify other parts of extension about auth changes
   */
  private notifyAuthChange(isAuthenticated: boolean): void {
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      data: { isAuthenticated },
    }).catch(() => {
      // Ignore errors if no listeners
    });
  }

  /**
   * Parse JWT token (client-side only, not for verification)
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url?.replace(/-/g, '+').replace(/_/g, '/') || '';
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
   * Handle authentication from web app (called by content script)
   */
  static async handleWebAuthCallback(data: any): Promise<void> {
    const authService = ExtensionAuthService.getInstance();
    
    try {
      // Verify this is a legitimate auth callback
      const authOrigin = await chrome.storage.local.get('auth_origin');
      if (!authOrigin || authOrigin.auth_origin !== chrome.runtime.id) {
        throw new Error('Invalid auth origin');
      }

      // Process auth data
      if (data.success && data.tokens && data.user) {
        const authData: AuthData = {
          user: data.user,
          tokens: data.tokens,
        };

        await ExtensionStorage.setAuthData(authData);
        authService.notifyAuthChange(true);
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Error handling web auth callback:', error);
      authService.notifyAuthChange(false);
      throw error;
    }
  }
} 