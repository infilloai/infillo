/**
 * Chrome Identity API Authentication Service
 * Implements Google OAuth directly in the extension using chrome.identity
 * Enhanced with bulletproof session persistence
 */

import { ExtensionStorage } from './storage';
import { AuthTokens, User, AuthData } from '../types/extension';
import { API_BASE_URL } from '../config/config';

export class ChromeAuthService {
  private static instance: ChromeAuthService;
  
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  public static getInstance(): ChromeAuthService {
    if (!ChromeAuthService.instance) {
      ChromeAuthService.instance = new ChromeAuthService();
    }
    return ChromeAuthService.instance;
  }

  constructor() {
    // Listen for storage changes to sync across tabs
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.authData) {
        this.handleAuthDataChange(changes.authData);
      }
    });

    // Handle extension startup - restore session immediately
    this.restoreSessionOnStartup();
  }

  /**
   * Restore session immediately on extension startup
   */
  private async restoreSessionOnStartup(): Promise<void> {
    try {
      console.log('🔄 Restoring session on startup...');
      
      const authData = await ExtensionStorage.getAuthData();
      if (!authData) {
        console.log('🔍 No existing session to restore');
        return;
      }

      // Check if token is expired
      if (Date.now() >= authData.tokens.expiresAt) {
        console.log('🔄 Token expired, attempting refresh...');
        const refreshed = await this.emergencyTokenRefresh();
        if (refreshed) {
          console.log('✅ Session restored via token refresh');
        } else {
          console.log('❌ Failed to restore session - tokens expired');
          await this.tryGoogleTokenFallback();
        }
      } else {
        console.log('✅ Session restored - valid tokens found');
        this.notifyAuthStateChange(true);
      }
    } catch (error) {
      console.error('🔴 Session restoration failed:', error);
    }
  }

  /**
   * Handle auth data changes from other parts of extension
   */
  private handleAuthDataChange(change: chrome.storage.StorageChange): void {
    if (change.newValue && !this.isRefreshing) {
      console.log('🔄 Auth data updated externally');
      this.notifyAuthStateChange(true);
    }
  }

  /**
   * Emergency token refresh with multiple fallback strategies
   */
  private async emergencyTokenRefresh(): Promise<boolean> {
    console.log('🚨 Starting emergency token refresh...');
    
    // Try backend refresh first
    const backendSuccess = await this.ensureValidToken();
    if (backendSuccess) {
      console.log('✅ Emergency refresh successful via backend');
      return true;
    }

    // Fallback to Google token refresh
    console.log('🔄 Backend refresh failed, trying Google token fallback...');
    const googleSuccess = await this.tryGoogleTokenFallback();
    if (googleSuccess) {
      console.log('✅ Emergency refresh successful via Google fallback');
      return true;
    }

    console.log('❌ All emergency refresh strategies failed');
    return false;
  }

  /**
   * Try to get a fresh Google token and re-authenticate
   */
  private async tryGoogleTokenFallback(): Promise<boolean> {
    try {
      console.log('🔄 Attempting Google token fallback...');
      
      // Try to get a fresh token silently first
      const silentToken = await this.getGoogleAuthTokenSilent();
      if (silentToken) {
        console.log('✅ Got silent Google token, re-authenticating...');
        const authData = await this.exchangeTokenWithBackend(silentToken);
        if (authData) {
          await ExtensionStorage.setAuthData(authData);
          this.notifyAuthStateChange(true);
          return true;
        }
      }

      console.log('🔍 Silent token failed, user will need to re-authenticate next time they interact');
      return false;
    } catch (error) {
      console.error('🔴 Google token fallback failed:', error);
      return false;
    }
  }

  /**
   * Get Google token silently (without user interaction)
   */
  private async getGoogleAuthTokenSilent(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          resolve(null);
          return;
        }
        resolve(token);
      });
    });
  }

  /**
   * Enhanced token validation with automatic refresh
   */
  async ensureValidToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      console.log('🔄 Waiting for ongoing refresh...');
      return await this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform token refresh (single attempt)
   */
  private async performTokenRefresh(): Promise<boolean> {
    const authData = await ExtensionStorage.getAuthData();
    if (!authData) return false;

    // Check if token is still valid (with buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minute buffer
    if (now < (authData.tokens.expiresAt - bufferTime)) {
      console.log('✅ Token still valid, no refresh needed');
      return true;
    }

    console.log('🔄 Refreshing tokens...');

    try {
      const newTokens = await this.refreshAccessToken(authData.tokens.refreshToken);
      if (newTokens) {
        const updatedAuthData: AuthData = {
          user: authData.user,
          tokens: newTokens,
        };
        
        await ExtensionStorage.setAuthData(updatedAuthData);
        console.log('✅ Token refresh successful');
        this.notifyAuthStateChange(true);
        return true;
      }
      
      console.log('❌ Token refresh failed - no new tokens received');
      return false;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
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
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data.tokens;
      }

      throw new Error(result.error || 'Unknown refresh error');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const authData = await ExtensionStorage.getAuthData();
      if (!authData) return false;

      // Instead of just checking expiry, ensure we have a valid token
      const validToken = await this.getValidAccessToken();
      return validToken !== null;
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
   * Authenticate user using Chrome Identity API
   */
  async authenticateUser(): Promise<void> {
    try {
      console.log('🔵 Starting Chrome Identity authentication...');
      
      // Get OAuth token using Chrome Identity API
      const token = await this.getGoogleAuthToken();
      console.log('🔵 Got Google token:', token ? 'SUCCESS' : 'FAILED');
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      // Exchange token with our backend
      console.log('🔵 Exchanging token with backend...');
      const authData = await this.exchangeTokenWithBackend(token);
      console.log('🔵 Backend exchange result:', authData ? 'SUCCESS' : 'FAILED');
      
      if (!authData) {
        throw new Error('Failed to exchange token with backend');
      }

      // Store authentication data
      await ExtensionStorage.setAuthData(authData);
      console.log('🔵 Stored auth data successfully');
      
      // Notify about auth state change
      this.notifyAuthStateChange(true);
      
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get Google OAuth token using Chrome Identity API
   */
  private async getGoogleAuthToken(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      console.log('🔵 Calling chrome.identity.getAuthToken...');
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome Identity API error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!token) {
          console.error('❌ No token received from Chrome Identity API');
          reject(new Error('No token received'));
          return;
        }
        
        console.log('✅ Chrome Identity API token received:', token.substring(0, 20) + '...');
        resolve(token);
      });
    });
  }

  /**
   * Exchange Google token with our backend to get user info and our tokens
   */
  private async exchangeTokenWithBackend(googleToken: string): Promise<AuthData | null> {
    try {
      console.log('🔵 Getting user info from Google...');
      // First, get user info from Google API
      const userInfo = await this.getUserInfoFromGoogle(googleToken);
      console.log('🔵 User info from Google:', userInfo ? 'SUCCESS' : 'FAILED', userInfo);
      
      if (!userInfo) {
        throw new Error('Failed to get user info from Google');
      }

      console.log('🔵 Sending request to backend:', {
        url: `${API_BASE_URL}/api/auth/google/extension`,
        userEmail: userInfo.email,
        userName: userInfo.name
      });

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

      console.log('🔵 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔴 Backend error response:', errorText);
        throw new Error(`Backend exchange failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('🔵 Backend success response:', result);
      
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
      console.error('❌ Error exchanging token with backend:', error);
      return null;
    }
  }

  /**
   * Get user info from Google API using the token
   */
  private async getUserInfoFromGoogle(token: string): Promise<any> {
    try {
      console.log('🔵 Fetching user info from Google API...');
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔵 Google API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔴 Google API error:', errorText);
        throw new Error(`Failed to get user info from Google: ${response.status}`);
      }

      const userInfo = await response.json();
      console.log('🔵 Google user info received:', {
        email: userInfo.email,
        name: userInfo.name,
        id: userInfo.id
      });

      return userInfo;
    } catch (error) {
      console.error('❌ Error getting user info from Google:', error);
      return null;
    }
  }

  /**
   * Enhanced get valid access token with automatic refresh
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      // First check if current token is valid
      const currentToken = await ExtensionStorage.getValidAccessToken();
      if (currentToken) {
        return currentToken;
      }

      // Token is expired or missing, try to refresh
      console.log('🔄 Current token invalid, attempting refresh...');
      const refreshed = await this.ensureValidToken();
      
      if (refreshed) {
        return await ExtensionStorage.getValidAccessToken();
      }

      console.log('❌ Failed to get valid access token');
      return null;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Enhanced logout with cleanup
   */
  async logout(): Promise<boolean> {
    try {
      // Revoke Chrome Identity token
      await this.revokeGoogleToken();
      
      // Clear stored auth data
      await ExtensionStorage.clearAuthData();
      
      // Notify about auth state change
      this.notifyAuthStateChange(false);
      
      console.log('✅ Logout successful');
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear stored data even if revocation fails
      await ExtensionStorage.clearAuthData();
      this.notifyAuthStateChange(false);
      return true;
    }
  }

  /**
   * Revoke Google OAuth token
   */
  private async revokeGoogleToken(): Promise<void> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          resolve(); // Already logged out or no token
          return;
        }

        // Revoke the token
        chrome.identity.removeCachedAuthToken({ token }, () => {
          // Also revoke on Google's servers
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
            method: 'POST',
          }).finally(() => {
            resolve();
          });
        });
      });
    });
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
    });
  }

  /**
   * Get current user profile from API
   */
  async fetchCurrentUser(): Promise<User | null> {
    try {
      const response = await this.authenticatedFetch('/api/auth/me');

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔄 401 received, triggering token refresh...');
          const refreshed = await this.ensureValidToken();
          if (refreshed) {
            // Retry the request
            const retryResponse = await this.authenticatedFetch('/api/auth/me');
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              return retryResult.data?.user || null;
            }
          }
          
          // If refresh failed or retry failed, clear auth
          await ExtensionStorage.clearAuthData();
          this.notifyAuthStateChange(false);
        }
        return null;
      }

      const result = await response.json();
      
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
  private notifyAuthStateChange(isAuthenticated: boolean): void {
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      data: { isAuthenticated },
    }).catch(() => {
      // Ignore errors if no listeners
    });
  }

  /**
   * Get session health status for debugging
   */
  async getSessionHealth(): Promise<{
    isValid: boolean;
    timeRemaining: number;
    lifetimeProgress: number;
    needsRefresh: boolean;
    lastRefresh?: number;
  }> {
    const authData = await ExtensionStorage.getAuthData();
    if (!authData) {
      return {
        isValid: false,
        timeRemaining: 0,
        lifetimeProgress: 1,
        needsRefresh: true,
      };
    }

    const now = Date.now();
    const tokenLifetime = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const timeRemaining = authData.tokens.expiresAt - now;
    const lifetimeProgress = Math.max(0, 1 - (timeRemaining / tokenLifetime));

    return {
      isValid: timeRemaining > 0,
      timeRemaining: Math.max(0, timeRemaining),
      lifetimeProgress: Math.min(1, lifetimeProgress),
      needsRefresh: timeRemaining < (7 * 24 * 60 * 60 * 1000), // Refresh when less than 7 days remaining
    };
  }
} 