"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthState, User, AuthTokens } from '@/types';
import { AuthService } from '@/lib/auth';

interface AuthContextType extends AuthState {
  login: (redirectUrl?: string) => void;
  logout: (logoutAll?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const authService = AuthService.getInstance();
  
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Send authentication data to extension
   */
  const sendAuthDataToExtension = useCallback((user: User, tokens: AuthTokens) => {
    try {
      const extensionId = localStorage.getItem('auth_extension_id');
      if (extensionId) {
        // Send message to extension
        const message = {
          type: 'AUTH_SUCCESS',
          data: {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        };

        // Try to send to extension (this will only work if extension is installed)
        if (window.chrome?.runtime) {
          try {
            window.chrome.runtime.sendMessage(extensionId, message);
          } catch (error) {
            console.log('Extension not available:', error);
          }
        }

        // Also try to communicate via postMessage for cross-origin scenarios
        window.postMessage(message, '*');
        
        // Clean up
        localStorage.removeItem('auth_extension_id');
        
        // Close the tab after a brief delay
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending auth data to extension:', error);
    }
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

            // Check for extension auth transfer first
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('source');
      const transferId = urlParams.get('transferId');
      
      console.log('🔵 Web app auth init - URL params:', { 
        source, 
        transferId, 
        fullUrl: window.location.href 
      });
      
      if (source === 'extension' && transferId) {
        console.log('✅ AUTH DEBUG: Extension auth transfer detected!');
        console.log('🔍 AUTH DEBUG: Transfer details:', { 
          source, 
          transferId,
          transferIdLength: transferId.length,
          transferIdFormat: transferId.substring(0, 4) + '...' + transferId.substring(transferId.length - 4)
        });
        
        try {
          console.log('🔄 AUTH DEBUG: Starting server retrieval process...');
          
          // Retrieve transfer data from server
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const endpoint = `${apiUrl}/api/auth/transfer/retrieve`;
          
          console.log('🔍 AUTH DEBUG: API request details:', {
            endpoint,
            transferId,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { transferId }
          });
          
          console.log('🌐 AUTH DEBUG: Making fetch request to backend...');
          const startTime = Date.now();
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transferId }),
          });

          const requestDuration = Date.now() - startTime;
          console.log('📡 AUTH DEBUG: Server response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            duration: `${requestDuration}ms`,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (response.ok) {
            console.log('✅ AUTH DEBUG: HTTP response is OK, parsing JSON...');
            const result = await response.json();
            console.log('📄 AUTH DEBUG: Server JSON response:', {
              success: result.success,
              hasData: !!result.data,
              error: result.error,
              fullResult: result
            });
            
            if (result.success && result.data) {
              const { user, tokens } = result.data;
              
              console.log('🎉 AUTH DEBUG: Auth data retrieved successfully!');
              console.log('👤 AUTH DEBUG: User data:', { 
                hasUser: !!user,
                userId: user?.id,
                userEmail: user?.email,
                userName: user?.name,
                isEmailVerified: user?.isEmailVerified
              });
              console.log('🔑 AUTH DEBUG: Token data:', {
                hasAccessToken: !!tokens?.accessToken,
                hasRefreshToken: !!tokens?.refreshToken,
                accessTokenLength: tokens?.accessToken?.length,
                expiresAt: tokens?.expiresAt,
                expiresAtDate: tokens?.expiresAt ? new Date(tokens.expiresAt).toLocaleString() : 'N/A',
                isTokenExpired: tokens?.expiresAt ? Date.now() > tokens.expiresAt : 'Unknown'
              });
              
              console.log('💾 AUTH DEBUG: Storing auth data using AuthService...');
              // Store the tokens using the auth service
              authService.storeAuthData(tokens, user);
              console.log('✅ AUTH DEBUG: Auth data stored in localStorage');
              
              console.log('🔄 AUTH DEBUG: Updating React state...');
              setState({
                user,
                tokens,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              console.log('✅ AUTH DEBUG: React state updated - user should be authenticated');
              
              // Verify storage worked
              const storedTokens = authService.getStoredTokens();
              const storedUser = authService.getStoredUser();
              console.log('🔍 AUTH DEBUG: Verification of stored data:', {
                tokensStored: !!storedTokens,
                userStored: !!storedUser,
                storedUserEmail: storedUser?.email
              });
              
              console.log('🔄 AUTH DEBUG: Cleaning up URL and redirecting...');
              // Remove the transfer parameters from URL and redirect to main app
              const cleanUrl = window.location.pathname;
              router.replace(cleanUrl);
              
              console.log('🎉 AUTH DEBUG: Extension auth transfer completed successfully!');
              console.log('⚡ AUTH DEBUG: User should now be authenticated in the web app');
              return;
            } else {
              console.error('❌ AUTH DEBUG: Server returned success=false or no data');
              console.error('🔍 AUTH DEBUG: Server error details:', {
                success: result.success,
                error: result.error,
                hasData: !!result.data,
                fullResponse: result
              });
            }
          } else {
            console.error('❌ AUTH DEBUG: HTTP request failed');
            const errorText = await response.text();
            console.error('🔍 AUTH DEBUG: HTTP error details:', {
              status: response.status,
              statusText: response.statusText,
              errorText,
              url: response.url
            });
          }
        } catch (error) {
          console.error('💥 AUTH DEBUG: Exception during transfer retrieval:', {
            error: error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : 'No stack trace'
          });
        }
        
        // If we get here, the transfer failed - clean up URL and continue with normal auth flow
        console.warn('⚠️  AUTH DEBUG: Extension auth transfer failed, falling back to normal auth');
        console.log('🧹 AUTH DEBUG: Cleaning up URL parameters...');
        const cleanUrl = window.location.pathname;
        router.replace(cleanUrl);
      } else {
        console.log('ℹ️  AUTH DEBUG: No extension transfer detected');
              console.log('🔍 AUTH DEBUG: URL analysis:', {
        hasSource: !!source,
        sourceValue: source,
        hasTransferId: !!transferId,
        transferIdValue: transferId,
        willCheckOAuth: !!urlParams.get('accessToken'),
        willCheckStoredAuth: !urlParams.get('accessToken'),
        allURLParams: Object.fromEntries(urlParams.entries()),
        fullSearchString: window.location.search
      });
      }

      // Check for OAuth callback
      console.log('🔍 AUTH DEBUG: Checking for OAuth callback...');
      if (urlParams.get('accessToken')) {
        console.log('🔄 AUTH DEBUG: OAuth callback detected, processing...');
        const result = authService.handleOAuthCallback();
        console.log('📋 AUTH DEBUG: OAuth callback result:', result);
        
        if (result.success) {
          console.log('✅ AUTH DEBUG: OAuth callback successful, getting user and tokens...');
          // Get the user and tokens after OAuth callback
          const tokens = authService.getStoredTokens();
          const user = await authService.getCurrentUser();
          
          console.log('🔍 AUTH DEBUG: Retrieved OAuth data:', {
            hasTokens: !!tokens,
            hasUser: !!user,
            userEmail: user?.email
          });
          
          if (tokens && user) {
            console.log('✅ AUTH DEBUG: Setting authenticated state from OAuth...');
            setState({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            console.log('📤 AUTH DEBUG: Sending auth data to extension (if applicable)...');
            // Send data to extension if this was an extension auth request
            sendAuthDataToExtension(user, tokens);
          }
          
          console.log('🔄 AUTH DEBUG: Redirecting after OAuth...');
          // Redirect to intended page after successful OAuth
          router.replace(result.redirectUrl || '/');
          return;
        } else {
          console.error('❌ AUTH DEBUG: OAuth callback failed:', result);
        }
      } else {
        console.log('ℹ️  AUTH DEBUG: No OAuth callback detected');
      }

      // Get stored tokens and user
      console.log('🔍 AUTH DEBUG: Checking stored authentication...');
      const tokens = authService.getStoredTokens();
      const storedUser = authService.getStoredUser();

      console.log('💾 AUTH DEBUG: Stored auth check:', {
        hasStoredTokens: !!tokens,
        hasStoredUser: !!storedUser,
        storedUserEmail: storedUser?.email,
        tokenExpiresAt: tokens?.expiresAt ? new Date(tokens.expiresAt).toLocaleString() : 'N/A',
        isTokenExpired: tokens?.expiresAt ? Date.now() > tokens.expiresAt : 'N/A'
      });

      if (tokens && storedUser) {
        console.log('✅ AUTH DEBUG: Found stored auth, verifying with server...');
        // Verify tokens are still valid by fetching current user
        const currentUser = await authService.getCurrentUser();
        
        console.log('🔍 AUTH DEBUG: Server verification result:', {
          currentUserRetrieved: !!currentUser,
          currentUserEmail: currentUser?.email,
          matches: storedUser.email === currentUser?.email
        });
        
        if (currentUser) {
          console.log('✅ AUTH DEBUG: Stored auth verified, setting authenticated state...');
          setState({
            user: currentUser,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          console.log('🎉 AUTH DEBUG: User authenticated from stored data!');
        } else {
          console.warn('⚠️  AUTH DEBUG: Stored tokens invalid, clearing auth...');
          // Invalid tokens, clear auth
          authService.clearStoredAuth();
          setState({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          console.log('🧹 AUTH DEBUG: Auth cleared due to invalid tokens');
        }
      } else {
        console.log('ℹ️  AUTH DEBUG: No stored auth found, user needs to sign in');
        setState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        console.log('📝 AUTH DEBUG: Set unauthenticated state');
      }
    } catch (error) {
      console.error('💥 AUTH DEBUG: Exception in auth initialization:', error);
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    } finally {
      // Final state check
      setTimeout(() => {
        const finalTokens = authService.getStoredTokens();
        const finalUser = authService.getStoredUser();
        console.log('🏁 AUTH DEBUG: Final authentication state:', {
          hasStoredTokens: !!finalTokens,
          hasStoredUser: !!finalUser,
          userEmail: finalUser?.email,
          currentTimestamp: new Date().toLocaleString(),
          pageUrl: window.location.href
        });
      }, 100);
    }
  }, [authService, router, sendAuthDataToExtension]);

  /**
   * Login function
   */
  const login = useCallback((redirectUrl?: string) => {
    authService.initiateGoogleLogin(redirectUrl);
  }, [authService]);

  /**
   * Logout function
   */
  const logout = useCallback(async (logoutAll = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await authService.logout(logoutAll);
      
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to logout properly' 
      }));
    }
  }, [authService, router]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      if (!state.isAuthenticated) return;

      const user = await authService.getCurrentUser();
      if (user) {
        setState(prev => ({ ...prev, user }));
      } else {
        // Failed to get user, logout
        await logout();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      await logout();
    }
  }, [authService, logout, state.isAuthenticated]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) return;

    const refreshInterval = setInterval(async () => {
      const tokens = authService.getStoredTokens();
      if (tokens) {
        setState(prev => ({ ...prev, tokens }));
      } else {
        await logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated, state.tokens, authService, logout]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for requiring authentication
 */
export function useRequireAuth(redirectTo = '/') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.login(window.location.pathname);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.login, router, redirectTo]);

  return auth;
} 