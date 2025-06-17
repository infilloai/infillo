/**
 * Authentication Guard Component
 * Ensures that protected content is only rendered for authenticated users
 */

'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  showLoadingOnAuth?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  showLoadingOnAuth = true
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading && showLoadingOnAuth) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default unauthenticated message
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 mb-4">
            You need to sign in to access this content.
          </p>
        </div>
      </div>
    );
  }

  // If not requiring auth, or user is authenticated, render children
  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };

  AuthenticatedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}

/**
 * Hook for conditional rendering based on authentication
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const shouldRender = isAuthenticated && !isLoading;
  const shouldShowLoading = isLoading;
  const shouldShowUnauthenticated = !isAuthenticated && !isLoading;
  
  return {
    shouldRender,
    shouldShowLoading,
    shouldShowUnauthenticated,
    isAuthenticated,
    isLoading
  };
} 