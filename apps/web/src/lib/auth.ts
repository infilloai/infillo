import { AuthTokens, User, ApiResponse } from '@/types';
import { API_CONFIG, AUTH_CONFIG } from './constants';

export class AuthService {
  private static instance: AuthService;
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get stored authentication tokens
   */
  getStoredTokens(): AuthTokens | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const storedTokens = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      if (!storedTokens) return null;
      
      const tokens = JSON.parse(storedTokens) as AuthTokens;
      
      // Check if tokens are expired
      if (Date.now() >= tokens.expiresAt) {
        this.clearStoredAuth();
        return null;
      }
      
      return tokens;
    } catch (error) {
      console.error('Error getting stored tokens:', error);
      this.clearStoredAuth();
      return null;
    }
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const storedUser = localStorage.getItem(AUTH_CONFIG.USER_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  /**
   * Store authentication data
   */
  storeAuthData(tokens: AuthTokens, user: User): void {
    try {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, JSON.stringify(tokens));
      localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  /**
   * Clear stored authentication data
   */
  clearStoredAuth(): void {
    try {
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.USER_KEY);
      localStorage.removeItem(AUTH_CONFIG.LOGIN_REDIRECT_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    let tokens = this.getStoredTokens();
    
    if (!tokens) return null;

    // Check if token needs refresh (5 minutes before expiry)
    const needsRefresh = Date.now() >= (tokens.expiresAt - AUTH_CONFIG.REFRESH_THRESHOLD);
    
    if (needsRefresh) {
      tokens = await this.refreshAccessToken(tokens.refreshToken);
      if (!tokens) return null;
    }

    return tokens.accessToken;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        this.clearStoredAuth();
        return null;
      }

      const result: ApiResponse<{ tokens: AuthTokens; user: User }> = await response.json();
      
      if (result.success && result.data) {
        const { tokens, user } = result.data;
        this.storeAuthData(tokens, user);
        return tokens;
      }

      this.clearStoredAuth();
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearStoredAuth();
      return null;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return null;

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.ME}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearStoredAuth();
        }
        return null;
      }

      const result: ApiResponse<{ user: User }> = await response.json();
      
      if (result.success && result.data) {
        const { user } = result.data;
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Initiate Google OAuth login
   */
  initiateGoogleLogin(redirectUrl?: string): void {
    try {
      // Store redirect URL for after login
      if (redirectUrl) {
        localStorage.setItem(AUTH_CONFIG.LOGIN_REDIRECT_KEY, redirectUrl);
      }

      // Redirect to Google OAuth
      window.location.href = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.GOOGLE}`;
    } catch (error) {
      console.error('Error initiating Google login:', error);
    }
  }

  /**
   * Handle OAuth callback with tokens from URL params
   */
  handleOAuthCallback(): { success: boolean; redirectUrl?: string } {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');

      if (!accessToken || !refreshToken) {
        return { success: false };
      }

      // Parse JWT to get expiry (simple decode, not verification)
      const tokenPayload = this.parseJWT(accessToken);
      const expiresAt = tokenPayload?.exp ? tokenPayload.exp * 1000 : Date.now() + 15 * 60 * 1000; // 15 min default

      const tokens: AuthTokens = {
        accessToken,
        refreshToken,
        expiresAt,
      };

      // Store tokens temporarily, user will be fetched by auth context
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, JSON.stringify(tokens));

      // Get redirect URL and clean up
      const redirectUrl = localStorage.getItem(AUTH_CONFIG.LOGIN_REDIRECT_KEY) || '/';
      localStorage.removeItem(AUTH_CONFIG.LOGIN_REDIRECT_KEY);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return { success: true, redirectUrl };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return { success: false };
    }
  }

  /**
   * Logout user
   */
  async logout(logoutAll = false): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (accessToken) {
        const endpoint = logoutAll 
          ? API_CONFIG.ENDPOINTS.AUTH.LOGOUT_ALL
          : API_CONFIG.ENDPOINTS.AUTH.LOGOUT;

        await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }

      this.clearStoredAuth();
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      this.clearStoredAuth();
      return true; // Still clear local data even if API call fails
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

    return fetch(url, {
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
   * Simple JWT parser (client-side only, not for verification)
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
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
} 