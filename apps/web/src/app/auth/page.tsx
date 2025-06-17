'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { User } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AuthState {
  loading: boolean;
  error: string | null;
  isExtensionAuth: boolean;
  extensionId: string | null;
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({
    loading: false,
    error: null,
    isExtensionAuth: false,
    extensionId: null,
  });

  // Check if this is an extension authentication request
  useEffect(() => {
    const source = searchParams.get('source');
    const extensionId = searchParams.get('extensionId');
    
    if (source === 'extension' && extensionId) {
      setAuthState(prev => ({
        ...prev,
        isExtensionAuth: true,
        extensionId: extensionId,
      }));
    }

    // Handle OAuth callback
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      setAuthState(prev => ({ ...prev, error: decodeURIComponent(error) }));
      return;
    }

    if (accessToken && refreshToken) {
      handleAuthSuccess(accessToken, refreshToken);
    }
  }, [searchParams]);

  const handleAuthSuccess = useCallback(async (accessToken: string, refreshToken: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      // Fetch user profile
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const { data: user } = await response.json();

      if (authState.isExtensionAuth && authState.extensionId) {
        // Send tokens to extension
        await sendTokensToExtension({
          accessToken,
          refreshToken,
          user,
        });
      } else {
        // Store tokens for web app
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect to information records
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Auth success handler error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Failed to complete authentication',
        loading: false 
      }));
    }
  }, [authState.isExtensionAuth, authState.extensionId]);

  const sendTokensToExtension = async (authData: {
    accessToken: string;
    refreshToken: string;
    user: User;
  }) => {
    try {
      // Method 1: Chrome Extension messaging (if available)
      if (typeof window !== 'undefined' && 
          window.chrome?.runtime && 
          authState.extensionId) {
        try {
          window.chrome.runtime.sendMessage(authState.extensionId, {
            type: 'AUTH_SUCCESS',
            data: authData,
          });
        } catch (chromeError) {
          console.log('Chrome messaging not available, using postMessage');
        }
      }

      // Method 2: PostMessage to opener window (extension popup)
      if (window.opener) {
        window.opener.postMessage({
          type: 'AUTH_SUCCESS',
          data: authData,
        }, '*');
      }

      // Method 3: Local storage communication
      localStorage.setItem('extensionAuth', JSON.stringify({
        timestamp: Date.now(),
        data: authData,
      }));

      // Show success message and close
      setAuthState(prev => ({ ...prev, loading: false }));
      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (error) {
      console.error('Failed to send tokens to extension:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Failed to communicate with extension',
        loading: false 
      }));
    }
  };

  const handleGoogleLogin = () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    // Build OAuth URL with extension parameters
    const authUrl = new URL(`${API_URL}/api/auth/google`);
    
    if (authState.isExtensionAuth && authState.extensionId) {
      authUrl.searchParams.set('source', 'extension');
      authUrl.searchParams.set('extensionId', authState.extensionId);
    }
    
    window.location.href = authUrl.toString();
  };

  const renderExtensionAuth = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/frame.svg"
              alt="InfilloAI Logo"
              width={34}
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-bold text-gray-900">InfilloAI</h1>
          </div>
          <p className="text-gray-600">Extension Authentication</p>
        </div>

        {authState.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{authState.error}</p>
          </div>
        )}

        {authState.loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {authState.loading ? 'Completing authentication...' : 'Authenticating...'}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign in to continue
              </h2>
              <p className="text-gray-600 text-sm">
                Authenticate to enable smart form filling with InfilloAI
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authState.loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to InfilloAI's Terms of Service
          </p>
        </div>
      </div>
    </div>
  );

  const renderWebAuth = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image
              src="/frame.svg"
              alt="InfilloAI Logo"
              width={34}
              height={32}
              className="w-10 h-10"
            />
            <h1 className="text-3xl font-bold text-gray-900">InfilloAI</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-600">
            Sign in to access your intelligent form assistant
          </p>
        </div>

        {authState.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{authState.error}</p>
          </div>
        )}

        {authState.loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing you in...</p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={authState.loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-3 shadow-sm mb-6"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium">Continue with Google</span>
            </button>

            <div className="space-y-4 text-center text-sm text-gray-600">
              <p>
                Get started with intelligent form filling and never type the same information twice
              </p>
              
              <div className="flex items-center justify-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Secure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Smart</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );

  return authState.isExtensionAuth ? renderExtensionAuth() : renderWebAuth();
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
} 