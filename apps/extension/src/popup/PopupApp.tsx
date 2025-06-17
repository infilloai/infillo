/**
 * Main Popup Application Component
 * Contains the primary user interface for the extension popup
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChromeAuthService } from '@/utils/chromeAuth';
import { AuthState } from '@/types/extension';
import { ApiService } from '@/utils/apiService';
import { WEB_APP_URL } from '@/config/config';
import styles from './PopupApp.module.css';

interface FeatureCard {
  icon: string;
  title: string;
  color: string;
}

const features: FeatureCard[] = [
  {
    icon: 'star',
    title: 'Smart form\ndetection',
    color: '#FFD129'
  },
  {
    icon: 'lock',
    title: 'Secure data\nstorage',
    color: '#F39E2C'
  },
  {
    icon: 'sparkles',
    title: 'AI-powered\nsuggestions',
    color: '#69C3FA'
  },
  {
    icon: 'click',
    title: 'One-click\nautofill',
    color: '#A78BFA'
  }
];

export const PopupApp: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const [authStep, setAuthStep] = useState<'idle' | 'authorizing' | 'exchanging' | 'complete'>('idle');
  const [currentOrigin, setCurrentOrigin] = useState<string>('');
  const [isOriginBlocked, setIsOriginBlocked] = useState<boolean>(false);
  const [isLoadingOrigin, setIsLoadingOrigin] = useState<boolean>(true);
  const [isTogglingOrigin, setIsTogglingOrigin] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const authService = ChromeAuthService.getInstance();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    initializeAuth();
    setupAuthListener();
    getCurrentOrigin();
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated && currentOrigin) {
      checkOriginBlockedStatus();
    }
  }, [authState.isAuthenticated, currentOrigin]);

  const getCurrentOrigin = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        const origin = url.origin;
        setCurrentOrigin(origin);
        console.log('🔵 Current origin:', origin);
      }
    } catch (error) {
      console.error('Error getting current origin:', error);
      setCurrentOrigin('');
    } finally {
      setIsLoadingOrigin(false);
    }
  };

  const checkOriginBlockedStatus = async () => {
    if (!currentOrigin || !authState.isAuthenticated) return;
    
    try {
      const isBlocked = await apiService.checkOriginBlocked(currentOrigin);
      setIsOriginBlocked(isBlocked);
      console.log('🔵 Origin blocked status:', isBlocked);
    } catch (error) {
      console.error('Error checking origin blocked status:', error);
      setIsOriginBlocked(false);
    }
  };

  const handleToggleBlocked = async () => {
    if (isTogglingOrigin) return;
    
    setIsTogglingOrigin(true);
    try {
      // Show immediate visual feedback by updating local state first
      const newBlockedState = !isOriginBlocked;
      setIsOriginBlocked(newBlockedState);
      
      console.log('🔄 Toggling blocked status for:', currentOrigin, 'to:', newBlockedState);
      
      const response = await apiService.toggleOriginBlock(currentOrigin);
      
      if (response.success) {
        console.log('✅ Toggle API successful:', response.data);
        
        // Update state based on actual API response (in case our optimistic update was wrong)
        setIsOriginBlocked(response.data.isBlocked);
        
        // Notify background script about the change for real-time form detection toggling
        try {
          await chrome.runtime.sendMessage({
            type: 'ORIGIN_BLOCK_STATUS_CHANGED',
            origin: currentOrigin,
            isBlocked: response.data.isBlocked
          });
          console.log('🔵 Notified background script about origin block status change');
        } catch (notifyError) {
          console.warn('⚠️ Failed to notify background script about status change:', notifyError);
        }
        
        // Show brief success message  
        setTimeout(() => {
          console.log('✅ Origin block status updated successfully');
        }, 100);
      } else {
        console.error('❌ Toggle API failed:', response);
        // Revert optimistic update on failure
        setIsOriginBlocked(!newBlockedState);
      }
    } catch (error) {
      console.error('❌ Error toggling blocked status:', error);
      // Revert optimistic update on error
      setIsOriginBlocked(!isOriginBlocked);
    } finally {
      setIsTogglingOrigin(false);
    }
  };

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Try to get current authentication state via background script
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_AUTH_STATE',
        });

        if (response?.success) {
          const { isAuthenticated, user } = response.data;
          
          setAuthState({
            user,
            tokens: null, // We don't expose tokens in UI
            isAuthenticated,
            isLoading: false,
            error: null,
          });

          // If authenticated, fetch fresh user data to ensure sync
          if (isAuthenticated && user) {
            try {
              const freshUser = await authService.fetchCurrentUser();
              if (freshUser) {
                setAuthState(prev => ({
                  ...prev,
                  user: freshUser,
                }));
              }
            } catch (freshUserError) {
              // Don't break if fresh user fetch fails
              console.log('Could not fetch fresh user data:', freshUserError);
            }
          }
          return; // Success, exit early
        }
      } catch (messageError) {
        console.log('Background script communication failed, using direct auth service:', messageError);
      }

      // Fallback to direct auth service check
      console.log('🔵 Using direct auth service check...');
      const [isAuthenticated, user] = await Promise.all([
        authService.isAuthenticated(),
        authService.getCurrentUser(),
      ]);

      console.log('🔵 Direct auth check result:', { isAuthenticated, user: user ? 'USER_FOUND' : 'NO_USER' });
      console.log('🔵 User object:', user);

      const newState = {
        user,
        tokens: null,
        isAuthenticated,
        isLoading: false,
        error: null,
      };

      console.log('🔵 Setting auth state to:', newState);
      setAuthState(newState);
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  };

  const setupAuthListener = () => {
    const handleMessage = (message: any) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        console.log('🔵 Auth state changed, refreshing...');
        initializeAuth();
    }
  };

    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  };

  const handleSignIn = async () => {
    try {
      console.log('🔵 Starting authentication process...');
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      setAuthStep('authorizing');
      
      // Add a small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔵 Requesting background script to handle OAuth...');
      setAuthStep('exchanging');
      
      try {
        // Try background script first
        const response = await chrome.runtime.sendMessage({
          type: 'BACKGROUND_OAUTH',
        });
        
        console.log('🔵 Background OAuth response:', response);
        
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to authenticate');
        }
        
        console.log('🔵 Authentication completed, updating UI...');
        setAuthStep('complete');
        
        // Update auth state with the response data
        setAuthState({
          user: response.data.user,
          tokens: null, // We don't expose tokens in UI
          isAuthenticated: response.data.isAuthenticated,
          isLoading: false,
          error: null,
        });
        
        console.log('✅ Authentication flow completed successfully');
      } catch (backgroundError) {
        console.log('🔴 Background script failed, using fallback:', backgroundError);
        
        // Fallback: Use direct auth service but try to handle popup better
        setAuthStep('exchanging');
        console.log('🔵 Using direct auth service as fallback...');
        
        // Store a reference to check if popup is still open
        const popupCheckInterval = setInterval(() => {
          console.log('🔵 Popup still open, waiting for auth completion...');
        }, 1000);
        
        try {
          await authService.authenticateUser();
          clearInterval(popupCheckInterval);
          
          // Refresh auth state after successful authentication
          await initializeAuth();
          console.log('✅ Fallback authentication completed');
        } catch (authError) {
          clearInterval(popupCheckInterval);
          throw authError;
        }
      }
    } catch (error) {
      console.error('❌ Error signing in:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sign in with Google',
      }));
      setAuthStep('idle');
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Logout directly using Chrome Identity API
      await authService.logout();
      
      // Update state immediately
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to sign out',
      }));
    }
  };

  const openWebApp = async () => {
    try {
      console.log('🔵 Starting secure auth transfer to web app...');

      // First check if user is authenticated in extension
      const authCheck = await chrome.runtime.sendMessage({
        type: 'GET_AUTH_STATE',
      });
      
      console.log('🔵 Extension auth state:', authCheck);
      
      if (!authCheck?.success || !authCheck?.data?.isAuthenticated) {
        console.log('❌ User not authenticated in extension, opening web app without transfer');
        
        // Send debug info to background script for persistent logging
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG',
          data: {
            stage: 'popup_not_authenticated',
            authCheck,
            timestamp: new Date().toISOString()
          }
        });
        
        chrome.tabs.create({
          url: WEB_APP_URL,
          active: true,
        });
        window.close();
        return;
      }

      // Request auth transfer via background script
      console.log('🔵 Requesting auth transfer from background script...');
      const transferResponse = await chrome.runtime.sendMessage({
        type: 'REQUEST_AUTH_TRANSFER',
      });
      
      console.log('🔵 Transfer response:', transferResponse);
      
      if (!transferResponse?.success) {
        console.error('❌ Failed to create auth transfer:', transferResponse?.error);
        
        // Send debug info to background script for persistent logging
        chrome.runtime.sendMessage({
          type: 'DEBUG_LOG',
          data: {
            stage: 'popup_failed',
            error: transferResponse?.error || 'Unknown error',
            fullResponse: transferResponse,
            timestamp: new Date().toISOString()
          }
        });
        
        // Still open the web app, but user will need to authenticate
        chrome.tabs.create({
          url: WEB_APP_URL,
          active: true,
        });
        window.close();
        return;
      }

      const { transferId, expiresAt } = transferResponse.data;

      // Send debug info to background script for persistent logging
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        data: {
          stage: 'popup_success',
          transferId,
          expiresAt,
          timestamp: new Date().toISOString()
        }
      });

      // Open web app with transfer ID
      const webAppUrl = new URL(WEB_APP_URL);
      webAppUrl.searchParams.set('source', 'extension');
      webAppUrl.searchParams.set('transferId', transferId);

      console.log('✅ Auth transfer created successfully:', {
        transferId,
        expiresAt: new Date(expiresAt).toLocaleTimeString(),
        url: webAppUrl.toString(),
        searchParams: webAppUrl.searchParams.toString()
      });

      // Send final debug info
      chrome.runtime.sendMessage({
        type: 'DEBUG_LOG',
        data: {
          stage: 'opening_web_app',
          url: webAppUrl.toString(),
          searchParams: webAppUrl.searchParams.toString(),
          timestamp: new Date().toISOString()
        }
      });

      chrome.tabs.create({
        url: webAppUrl.toString(),
        active: true,
      });
      
      window.close();
    } catch (error) {
      console.error('❌ Error transferring auth to web app:', error);
      
      // Fallback: open web app without auth transfer
      chrome.tabs.create({
        url: WEB_APP_URL,
        active: true,
      });
      window.close();
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLoadingMessage = () => {
    switch (authStep) {
      case 'authorizing':
        return 'Connecting to authentication service...';
      case 'exchanging':
        return 'Completing authentication...';
      case 'complete':
        return 'Welcome back!';
      default:
        return authState.error ? 'Retrying...' : 'Signing you in...';
    }
  };

  console.log('🔵 Rendering with auth state:', { 
    isAuthenticated: authState.isAuthenticated, 
    hasUser: !!authState.user, 
    isLoading: authState.isLoading,
    authStep,
    userEmail: authState.user?.email 
  });

  if (authState.isLoading) {
    console.log('🔵 Rendering loading view, step:', authStep);
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingLogo}>
            <svg className={styles.loadingLogoIcon} width="34" height="32" viewBox="0 0 34 32" fill="none">
              <g clipPath="url(#clip0_131_3793)">
                <path fillRule="evenodd" clipRule="evenodd" d="M18.6038 6.97964C17.5219 6.97964 16.4506 7.19215 15.451 7.60503C14.4515 8.01788 13.5433 8.62307 12.7783 9.38592C12.0133 10.1488 11.4065 11.0545 10.9924 12.0513C10.7022 12.7499 10.5108 13.4837 10.4222 14.2316C10.3526 14.8194 10.0305 15.3622 9.5009 15.6263L7.9343 16.4074C7.40465 16.6715 7.05716 17.2144 7.12678 17.8022C7.21536 18.5501 7.40684 19.2838 7.69702 19.9824C8.11108 20.9792 8.71791 21.8849 9.48287 22.6478C10.2479 23.4107 11.1562 24.0159 12.1556 24.4287C13.1552 24.8416 14.2265 25.0541 15.3083 25.0541C16.3903 25.0541 17.4616 24.8416 18.4611 24.4287C19.4606 24.0159 20.3689 23.4107 21.1339 22.6478C21.8989 21.8849 22.5057 20.9792 22.9197 19.9824C23.2099 19.2838 23.4014 18.5501 23.49 17.8022C23.5596 17.2144 23.8816 16.6715 24.4113 16.4074L25.9779 15.6263C26.5075 15.3622 26.855 14.8194 26.7854 14.2316C26.6968 13.4837 26.5053 12.7499 26.2151 12.0513C25.8011 11.0545 25.1942 10.1488 24.4293 9.38592C23.6643 8.62307 22.7561 8.01788 21.7565 7.60503C20.7569 7.19215 19.6856 6.97964 18.6038 6.97964ZM22.4095 13.6233C22.4925 13.8232 22.5594 14.0289 22.6097 14.2383C22.748 14.8138 22.3882 15.3622 21.8586 15.6263L20.2921 16.4074C19.7624 16.6715 19.4525 17.2199 19.3143 17.7954C19.2639 18.0049 19.1971 18.2105 19.1141 18.4105C18.907 18.9088 18.6036 19.3616 18.2211 19.7431C17.8386 20.1246 17.3845 20.4272 16.8848 20.6336C16.385 20.84 15.8493 20.9463 15.3083 20.9463C14.7675 20.9463 14.2318 20.84 13.732 20.6336C13.2323 20.4272 12.7782 20.1246 12.3956 19.7431C12.0131 19.3616 11.7097 18.9088 11.5027 18.4105C11.4196 18.2105 11.3528 18.0049 11.3025 17.7954C11.1643 17.2199 11.5239 16.6715 12.0536 16.4074L13.6201 15.6263C14.1498 15.3622 14.4596 14.8138 14.5979 14.2383C14.6482 14.0289 14.7151 13.8232 14.7981 13.6233C15.0051 13.1249 15.3085 12.6721 15.691 12.2907C16.0735 11.9092 16.5276 11.6066 17.0274 11.4002C17.5272 11.1938 18.0628 11.0875 18.6038 11.0875C19.1448 11.0875 19.6804 11.1938 20.1802 11.4002C20.6799 11.6066 21.134 11.9092 21.5165 12.2907C21.899 12.6721 22.2025 13.1249 22.4095 13.6233Z" fill="#4F39F6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M18.6039 0.407104C16.6565 0.407104 14.7281 0.789609 12.9289 1.53279C11.1298 2.27596 9.49502 3.36526 8.11793 4.73846C6.74094 6.11168 5.64862 7.74191 4.90338 9.53607C4.28187 11.0323 3.91191 12.6183 3.80619 14.23C3.76745 14.8207 3.43982 15.3622 2.91013 15.6263L1.34361 16.4074C0.81392 16.6715 0.472056 17.2131 0.510796 17.8037C0.616517 19.4155 0.986478 21.0014 1.60798 22.4976C2.35322 24.2918 3.44554 25.922 4.82257 27.2953C6.19959 28.6685 7.83438 29.7577 9.63356 30.5009C11.4327 31.2441 13.361 31.6266 15.3084 31.6266C17.2559 31.6266 19.1842 31.2441 20.9833 30.5009C22.7825 29.7577 24.4173 28.6685 25.7943 27.2953C27.1714 25.922 28.2636 24.2918 29.0089 22.4976C29.6304 21.0014 30.0004 19.4155 30.1061 17.8037C30.1449 17.2131 30.4724 16.6715 31.0021 16.4074L32.5687 15.6263C33.0984 15.3622 33.4402 14.8207 33.4015 14.23C33.2958 12.6183 32.9258 11.0323 32.3043 9.53607C31.559 7.74191 30.4667 6.11168 29.0897 4.73846C27.7127 3.36526 26.0779 2.27596 24.2788 1.53279C22.4796 0.789609 20.5513 0.407104 18.6039 0.407104ZM25.9747 17.8031C26.0283 17.2136 26.3532 16.6715 26.8829 16.4074L28.4494 15.6263C28.9791 15.3622 29.3237 14.8201 29.2701 14.2307C29.1726 13.1588 28.913 12.1058 28.4986 11.1081C27.9603 9.81229 27.1715 8.63492 26.1769 7.64314C25.1824 6.65138 24.0018 5.86467 22.7024 5.32793C21.403 4.79119 20.0103 4.51493 18.6039 4.51493C17.1973 4.51493 15.8047 4.79119 14.5053 5.32793C13.2059 5.86467 12.0252 6.65138 11.0307 7.64314C10.0362 8.63492 9.24729 9.81229 8.70907 11.1081C8.29463 12.1058 8.03504 13.1588 7.93756 14.2307C7.88394 14.8201 7.55906 15.3622 7.02937 15.6263L5.46285 16.4074C4.93316 16.6715 4.58858 17.2136 4.64218 17.8031C4.73966 18.8749 4.99923 19.9279 5.41366 20.9257C5.95189 22.2214 6.74079 23.3988 7.73531 24.3906C8.72983 25.3823 9.91047 26.1691 11.2099 26.7058C12.5093 27.2425 13.902 27.5187 15.3084 27.5187C16.7149 27.5187 18.1076 27.2425 19.407 26.7058C20.7064 26.1691 21.8871 25.3823 22.8816 24.3906C23.8761 23.3988 24.665 22.2214 25.2032 20.9257C25.6176 19.9279 25.8772 18.8749 25.9747 17.8031Z" fill="#4F39F6"/>
                <path d="M33.4291 14.8606H29.3084C29.3066 15.0706 29.1832 15.2606 28.9939 15.3549L26.3388 16.6788C26.1496 16.7732 26.0287 16.9631 26.0139 17.1732H30.1346C30.1476 16.963 30.2688 16.7732 30.4581 16.6788L33.1132 15.3549C33.3024 15.2606 33.4254 15.0707 33.4291 14.8606Z" fill="#7463F8"/>
                <path d="M0.483398 17.1732H4.6041C4.60591 16.9631 4.72924 16.7732 4.91854 16.6788L7.57361 15.3549C7.76291 15.2606 7.8837 15.0706 7.89861 14.8606H3.77788C3.76483 15.0707 3.64366 15.2606 3.45437 15.3549L0.7993 16.6788C0.610009 16.7732 0.487025 16.963 0.483398 17.1732Z" fill="#7463F8"/>
                <path d="M10.3719 14.8606C10.3551 15.0706 10.2346 15.2606 10.0454 15.3549L7.39026 16.6788C7.20094 16.7732 7.07723 16.9632 7.07739 17.1732H11.2035C11.1947 16.9636 11.3201 16.7732 11.5095 16.6788L14.1645 15.3549C14.354 15.2605 14.4728 15.0701 14.498 14.8606H10.3719Z" fill="#7463F8"/>
                <path d="M22.7091 14.8606C22.7178 15.0701 22.5925 15.2605 22.403 15.3549L19.748 16.6788C19.5586 16.7732 19.4398 16.9636 19.4146 17.1732H23.5407C23.5575 16.9632 23.6779 16.7732 23.8672 16.6788L26.5223 15.3549C26.7116 15.2606 26.8353 15.0706 26.8351 14.8606H22.7091Z" fill="#7463F8"/>
              </g>
              <defs>
                <clipPath id="clip0_131_3793">
                  <rect width="33.561" height="32" fill="white" transform="translate(0.00585938)"/>
                </clipPath>
              </defs>
            </svg>
          </div>
          
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
          
          <div className={styles.loadingText}>
            <h3>InfilloAI</h3>
            <p>{getLoadingMessage()}</p>
            {authStep === 'authorizing' && (
              <small style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Setting up secure authentication...
              </small>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated view
  if (authState.isAuthenticated && authState.user) {
    console.log('🔵 Rendering authenticated view for user:', authState.user.email);
    console.log('🔵 User object for rendering:', authState.user);
    
    try {
      return (
        <div className={styles.authenticatedContainer}>
          <header className={styles.authenticatedHeader}>
          <div className={styles.logoContainer}>
            <svg className={styles.logoIcon} width="24" height="24" viewBox="0 0 34 32" fill="none">
              <g clipPath="url(#clip0_131_3793)">
                <path fillRule="evenodd" clipRule="evenodd" d="M18.6038 6.97964C17.5219 6.97964 16.4506 7.19215 15.451 7.60503C14.4515 8.01788 13.5433 8.62307 12.7783 9.38592C12.0133 10.1488 11.4065 11.0545 10.9924 12.0513C10.7022 12.7499 10.5108 13.4837 10.4222 14.2316C10.3526 14.8194 10.0305 15.3622 9.5009 15.6263L7.9343 16.4074C7.40465 16.6715 7.05716 17.2144 7.12678 17.8022C7.21536 18.5501 7.40684 19.2838 7.69702 19.9824C8.11108 20.9792 8.71791 21.8849 9.48287 22.6478C10.2479 23.4107 11.1562 24.0159 12.1556 24.4287C13.1552 24.8416 14.2265 25.0541 15.3083 25.0541C16.3903 25.0541 17.4616 24.8416 18.4611 24.4287C19.4606 24.0159 20.3689 23.4107 21.1339 22.6478C21.8989 21.8849 22.5057 20.9792 22.9197 19.9824C23.2099 19.2838 23.4014 18.5501 23.49 17.8022C23.5596 17.2144 23.8816 16.6715 24.4113 16.4074L25.9779 15.6263C26.5075 15.3622 26.855 14.8194 26.7854 14.2316C26.6968 13.4837 26.5053 12.7499 26.2151 12.0513C25.8011 11.0545 25.1942 10.1488 24.4293 9.38592C23.6643 8.62307 22.7561 8.01788 21.7565 7.60503C20.7569 7.19215 19.6856 6.97964 18.6038 6.97964ZM22.4095 13.6233C22.4925 13.8232 22.5594 14.0289 22.6097 14.2383C22.748 14.8138 22.3882 15.3622 21.8586 15.6263L20.2921 16.4074C19.7624 16.6715 19.4525 17.2199 19.3143 17.7954C19.2639 18.0049 19.1971 18.2105 19.1141 18.4105C18.907 18.9088 18.6036 19.3616 18.2211 19.7431C17.8386 20.1246 17.3845 20.4272 16.8848 20.6336C16.385 20.84 15.8493 20.9463 15.3083 20.9463C14.7675 20.9463 14.2318 20.84 13.732 20.6336C13.2323 20.4272 12.7782 20.1246 12.3956 19.7431C12.0131 19.3616 11.7097 18.9088 11.5027 18.4105C11.4196 18.2105 11.3528 18.0049 11.3025 17.7954C11.1643 17.2199 11.5239 16.6715 12.0536 16.4074L13.6201 15.6263C14.1498 15.3622 14.4596 14.8138 14.5979 14.2383C14.6482 14.0289 14.7151 13.8232 14.7981 13.6233C15.0051 13.1249 15.3085 12.6721 15.691 12.2907C16.0735 11.9092 16.5276 11.6066 17.0274 11.4002C17.5272 11.1938 18.0628 11.0875 18.6038 11.0875C19.1448 11.0875 19.6804 11.1938 20.1802 11.4002C20.6799 11.6066 21.134 11.9092 21.5165 12.2907C21.899 12.6721 22.2025 13.1249 22.4095 13.6233Z" fill="#4F39F6"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M18.6039 0.407104C16.6565 0.407104 14.7281 0.789609 12.9289 1.53279C11.1298 2.27596 9.49502 3.36526 8.11793 4.73846C6.74094 6.11168 5.64862 7.74191 4.90338 9.53607C4.28187 11.0323 3.91191 12.6183 3.80619 14.23C3.76745 14.8207 3.43982 15.3622 2.91013 15.6263L1.34361 16.4074C0.81392 16.6715 0.472056 17.2131 0.510796 17.8037C0.616517 19.4155 0.986478 21.0014 1.60798 22.4976C2.35322 24.2918 3.44554 25.922 4.82257 27.2953C6.19959 28.6685 7.83438 29.7577 9.63356 30.5009C11.4327 31.2441 13.361 31.6266 15.3084 31.6266C17.2559 31.6266 19.1842 31.2441 20.9833 30.5009C22.7825 29.7577 24.4173 28.6685 25.7943 27.2953C27.1714 25.922 28.2636 24.2918 29.0089 22.4976C29.6304 21.0014 30.0004 19.4155 30.1061 17.8037C30.1449 17.2131 30.4724 16.6715 31.0021 16.4074L32.5687 15.6263C33.0984 15.3622 33.4402 14.8207 33.4015 14.23C33.2958 12.6183 32.9258 11.0323 32.3043 9.53607C31.559 7.74191 30.4667 6.11168 29.0897 4.73846C27.7127 3.36526 26.0779 2.27596 24.2788 1.53279C22.4796 0.789609 20.5513 0.407104 18.6039 0.407104ZM25.9747 17.8031C26.0283 17.2136 26.3532 16.6715 26.8829 16.4074L28.4494 15.6263C28.9791 15.3622 29.3237 14.8201 29.2701 14.2307C29.1726 13.1588 28.913 12.1058 28.4986 11.1081C27.9603 9.81229 27.1715 8.63492 26.1769 7.64314C25.1824 6.65138 24.0018 5.86467 22.7024 5.32793C21.403 4.79119 20.0103 4.51493 18.6039 4.51493C17.1973 4.51493 15.8047 4.79119 14.5053 5.32793C13.2059 5.86467 12.0252 6.65138 11.0307 7.64314C10.0362 8.63492 9.24729 9.81229 8.70907 11.1081C8.29463 12.1058 8.03504 13.1588 7.93756 14.2307C7.88394 14.8201 7.55906 15.3622 7.02937 15.6263L5.46285 16.4074C4.93316 16.6715 4.58858 17.2136 4.64218 17.8031C4.73966 18.8749 4.99923 19.9279 5.41366 20.9257C5.95189 22.2214 6.74079 23.3988 7.73531 24.3906C8.72983 25.3823 9.91047 26.1691 11.2099 26.7058C12.5093 27.2425 13.902 27.5187 15.3084 27.5187C16.7149 27.5187 18.1076 27.2425 19.407 26.7058C20.7064 26.1691 21.8871 25.3823 22.8816 24.3906C23.8761 23.3988 24.665 22.2214 25.2032 20.9257C25.6176 19.9279 25.8772 18.8749 25.9747 17.8031Z" fill="#4F39F6"/>
                <path d="M33.4291 14.8606H29.3084C29.3066 15.0706 29.1832 15.2606 28.9939 15.3549L26.3388 16.6788C26.1496 16.7732 26.0287 16.9631 26.0139 17.1732H30.1346C30.1476 16.963 30.2688 16.7732 30.4581 16.6788L33.1132 15.3549C33.3024 15.2606 33.4254 15.0707 33.4291 14.8606Z" fill="#7463F8"/>
                <path d="M0.483398 17.1732H4.6041C4.60591 16.9631 4.72924 16.7732 4.91854 16.6788L7.57361 15.3549C7.76291 15.2606 7.8837 15.0706 7.89861 14.8606H3.77788C3.76483 15.0707 3.64366 15.2606 3.45437 15.3549L0.7993 16.6788C0.610009 16.7732 0.487025 16.963 0.483398 17.1732Z" fill="#7463F8"/>
                <path d="M10.3719 14.8606C10.3551 15.0706 10.2346 15.2606 10.0454 15.3549L7.39026 16.6788C7.20094 16.7732 7.07723 16.9632 7.07739 17.1732H11.2035C11.1947 16.9636 11.3201 16.7732 11.5095 16.6788L14.1645 15.3549C14.354 15.2605 14.4728 15.0701 14.498 14.8606H10.3719Z" fill="#7463F8"/>
                <path d="M22.7091 14.8606C22.7178 15.0701 22.5925 15.2605 22.403 15.3549L19.748 16.6788C19.5586 16.7732 19.4398 16.9636 19.4146 17.1732H23.5407C23.5575 16.9632 23.6779 16.7732 23.8672 16.6788L26.5223 15.3549C26.7116 15.2606 26.8353 15.0706 26.8351 14.8606H22.7091Z" fill="#7463F8"/>
              </g>
              <defs>
                <clipPath id="clip0_131_3793">
                  <rect width="33.561" height="32" fill="white" transform="translate(0.00585938)"/>
                </clipPath>
              </defs>
            </svg>
            <span className={styles.logoText}>InfilloAI</span>
          </div>
          
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {authState.user.picture ? (
                <img src={authState.user.picture} alt={authState.user.name} />
              ) : (
                <span>{getUserInitials(authState.user.name)}</span>
              )}
            </div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{authState.user.name}</p>
              <p className={styles.userEmail}>{authState.user.email}</p>
            </div>
            {(() => {
              console.log('🔵 Rendering header logout button');
              return (
                <button className={styles.headerLogoutButton} onClick={handleSignOut} title="Sign Out">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              );
            })()}
          </div>
        </header>

        <main className={styles.authenticatedContent}>
          <div className={styles.quickActions}>
            <button className={styles.primaryAction} onClick={openWebApp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M10 6H5C3.89543 6 3 6.89543 3 8V18C3 19.1046 3.89543 20 5 20H15C16.1046 20 17 19.1046 17 18V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 4H20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 4L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open Web App
            </button>
          </div>

          <div className={styles.originControl}>
            <h3>Website Detection</h3>
            <div className={styles.originInfo}>
              <div className={styles.originDisplay}>
                <div className={styles.originIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.originDetails}>
                  <p className={styles.originUrl}>
                    {isLoadingOrigin ? 'Loading...' : currentOrigin || 'Unknown origin'}
                  </p>
                  <span className={styles.originStatus}>
                    {isOriginBlocked ? 'Detection disabled' : 'Detection enabled'}
                  </span>
                </div>
              </div>
              
              <div className={styles.toggleContainer}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={!isOriginBlocked}
                    onChange={handleToggleBlocked}
                    disabled={isLoadingOrigin || !currentOrigin || isTogglingOrigin}
                  />
                  <span className={styles.toggleSlider}>
                    {isTogglingOrigin && (
                      <div className={styles.toggleSpinner}>
                        <div className={styles.spinner}></div>
                      </div>
                    )}
                  </span>
                </label>
              </div>
            </div>
            
            <p className={styles.originDescription}>
              {isOriginBlocked 
                ? 'InfilloAI detection is disabled for this website. Forms will not be detected or filled.'
                : 'InfilloAI can detect and help fill forms on this website.'
              }
            </p>
          </div>


        </main>


      </div>
    );
    } catch (error) {
      console.error('❌ Error rendering authenticated view:', error);
      return (
        <div className={styles.container}>
          <div className={styles.loading}>
            <p>Error loading authenticated view. Check console.</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      );
    }
  }

  // Landing page view (not authenticated)
  console.log('🔵 Rendering unauthenticated landing view');
  return (
    <div className={styles.landingContainer}>
      <header className={styles.landingHeader}>
        <div className={styles.logoContainer}>
          <svg className={styles.logoIcon} width="34" height="32" viewBox="0 0 34 32" fill="none">
            <g clipPath="url(#clip0_131_3793)">
              <path fillRule="evenodd" clipRule="evenodd" d="M18.6038 6.97964C17.5219 6.97964 16.4506 7.19215 15.451 7.60503C14.4515 8.01788 13.5433 8.62307 12.7783 9.38592C12.0133 10.1488 11.4065 11.0545 10.9924 12.0513C10.7022 12.7499 10.5108 13.4837 10.4222 14.2316C10.3526 14.8194 10.0305 15.3622 9.5009 15.6263L7.9343 16.4074C7.40465 16.6715 7.05716 17.2144 7.12678 17.8022C7.21536 18.5501 7.40684 19.2838 7.69702 19.9824C8.11108 20.9792 8.71791 21.8849 9.48287 22.6478C10.2479 23.4107 11.1562 24.0159 12.1556 24.4287C13.1552 24.8416 14.2265 25.0541 15.3083 25.0541C16.3903 25.0541 17.4616 24.8416 18.4611 24.4287C19.4606 24.0159 20.3689 23.4107 21.1339 22.6478C21.8989 21.8849 22.5057 20.9792 22.9197 19.9824C23.2099 19.2838 23.4014 18.5501 23.49 17.8022C23.5596 17.2144 23.8816 16.6715 24.4113 16.4074L25.9779 15.6263C26.5075 15.3622 26.855 14.8194 26.7854 14.2316C26.6968 13.4837 26.5053 12.7499 26.2151 12.0513C25.8011 11.0545 25.1942 10.1488 24.4293 9.38592C23.6643 8.62307 22.7561 8.01788 21.7565 7.60503C20.7569 7.19215 19.6856 6.97964 18.6038 6.97964ZM22.4095 13.6233C22.4925 13.8232 22.5594 14.0289 22.6097 14.2383C22.748 14.8138 22.3882 15.3622 21.8586 15.6263L20.2921 16.4074C19.7624 16.6715 19.4525 17.2199 19.3143 17.7954C19.2639 18.0049 19.1971 18.2105 19.1141 18.4105C18.907 18.9088 18.6036 19.3616 18.2211 19.7431C17.8386 20.1246 17.3845 20.4272 16.8848 20.6336C16.385 20.84 15.8493 20.9463 15.3083 20.9463C14.7675 20.9463 14.2318 20.84 13.732 20.6336C13.2323 20.4272 12.7782 20.1246 12.3956 19.7431C12.0131 19.3616 11.7097 18.9088 11.5027 18.4105C11.4196 18.2105 11.3528 18.0049 11.3025 17.7954C11.1643 17.2199 11.5239 16.6715 12.0536 16.4074L13.6201 15.6263C14.1498 15.3622 14.4596 14.8138 14.5979 14.2383C14.6482 14.0289 14.7151 13.8232 14.7981 13.6233C15.0051 13.1249 15.3085 12.6721 15.691 12.2907C16.0735 11.9092 16.5276 11.6066 17.0274 11.4002C17.5272 11.1938 18.0628 11.0875 18.6038 11.0875C19.1448 11.0875 19.6804 11.1938 20.1802 11.4002C20.6799 11.6066 21.134 11.9092 21.5165 12.2907C21.899 12.6721 22.2025 13.1249 22.4095 13.6233Z" fill="#4F39F6"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M18.6039 0.407104C16.6565 0.407104 14.7281 0.789609 12.9289 1.53279C11.1298 2.27596 9.49502 3.36526 8.11793 4.73846C6.74094 6.11168 5.64862 7.74191 4.90338 9.53607C4.28187 11.0323 3.91191 12.6183 3.80619 14.23C3.76745 14.8207 3.43982 15.3622 2.91013 15.6263L1.34361 16.4074C0.81392 16.6715 0.472056 17.2131 0.510796 17.8037C0.616517 19.4155 0.986478 21.0014 1.60798 22.4976C2.35322 24.2918 3.44554 25.922 4.82257 27.2953C6.19959 28.6685 7.83438 29.7577 9.63356 30.5009C11.4327 31.2441 13.361 31.6266 15.3084 31.6266C17.2559 31.6266 19.1842 31.2441 20.9833 30.5009C22.7825 29.7577 24.4173 28.6685 25.7943 27.2953C27.1714 25.922 28.2636 24.2918 29.0089 22.4976C29.6304 21.0014 30.0004 19.4155 30.1061 17.8037C30.1449 17.2131 30.4724 16.6715 31.0021 16.4074L32.5687 15.6263C33.0984 15.3622 33.4402 14.8207 33.4015 14.23C33.2958 12.6183 32.9258 11.0323 32.3043 9.53607C31.559 7.74191 30.4667 6.11168 29.0897 4.73846C27.7127 3.36526 26.0779 2.27596 24.2788 1.53279C22.4796 0.789609 20.5513 0.407104 18.6039 0.407104ZM25.9747 17.8031C26.0283 17.2136 26.3532 16.6715 26.8829 16.4074L28.4494 15.6263C28.9791 15.3622 29.3237 14.8201 29.2701 14.2307C29.1726 13.1588 28.913 12.1058 28.4986 11.1081C27.9603 9.81229 27.1715 8.63492 26.1769 7.64314C25.1824 6.65138 24.0018 5.86467 22.7024 5.32793C21.403 4.79119 20.0103 4.51493 18.6039 4.51493C17.1973 4.51493 15.8047 4.79119 14.5053 5.32793C13.2059 5.86467 12.0252 6.65138 11.0307 7.64314C10.0362 8.63492 9.24729 9.81229 8.70907 11.1081C8.29463 12.1058 8.03504 13.1588 7.93756 14.2307C7.88394 14.8201 7.55906 15.3622 7.02937 15.6263L5.46285 16.4074C4.93316 16.6715 4.58858 17.2136 4.64218 17.8031C4.73966 18.8749 4.99923 19.9279 5.41366 20.9257C5.95189 22.2214 6.74079 23.3988 7.73531 24.3906C8.72983 25.3823 9.91047 26.1691 11.2099 26.7058C12.5093 27.2425 13.902 27.5187 15.3084 27.5187C16.7149 27.5187 18.1076 27.2425 19.407 26.7058C20.7064 26.1691 21.8871 25.3823 22.8816 24.3906C23.8761 23.3988 24.665 22.2214 25.2032 20.9257C25.6176 19.9279 25.8772 18.8749 25.9747 17.8031Z" fill="#4F39F6"/>
              <path d="M33.4291 14.8606H29.3084C29.3066 15.0706 29.1832 15.2606 28.9939 15.3549L26.3388 16.6788C26.1496 16.7732 26.0287 16.9631 26.0139 17.1732H30.1346C30.1476 16.963 30.2688 16.7732 30.4581 16.6788L33.1132 15.3549C33.3024 15.2606 33.4254 15.0707 33.4291 14.8606Z" fill="#7463F8"/>
              <path d="M0.483398 17.1732H4.6041C4.60591 16.9631 4.72924 16.7732 4.91854 16.6788L7.57361 15.3549C7.76291 15.2606 7.8837 15.0706 7.89861 14.8606H3.77788C3.76483 15.0707 3.64366 15.2606 3.45437 15.3549L0.7993 16.6788C0.610009 16.7732 0.487025 16.963 0.483398 17.1732Z" fill="#7463F8"/>
              <path d="M10.3719 14.8606C10.3551 15.0706 10.2346 15.2606 10.0454 15.3549L7.39026 16.6788C7.20094 16.7732 7.07723 16.9632 7.07739 17.1732H11.2035C11.1947 16.9636 11.3201 16.7732 11.5095 16.6788L14.1645 15.3549C14.354 15.2605 14.4728 15.0701 14.498 14.8606H10.3719Z" fill="#7463F8"/>
              <path d="M22.7091 14.8606C22.7178 15.0701 22.5925 15.2605 22.403 15.3549L19.748 16.6788C19.5586 16.7732 19.4398 16.9636 19.4146 17.1732H23.5407C23.5575 16.9632 23.6779 16.7732 23.8672 16.6788L26.5223 15.3549C26.7116 15.2606 26.8353 15.0706 26.8351 14.8606H22.7091Z" fill="#7463F8"/>
            </g>
            <defs>
              <clipPath id="clip0_131_3793">
                <rect width="33.561" height="32" fill="white" transform="translate(0.00585938)"/>
              </clipPath>
            </defs>
          </svg>
          <span className={styles.logoText}>InfilloAI</span>
        </div>
        <p className={styles.subtitle}>Your intelligent form-filling assistant.</p>
      </header>

      <main className={styles.landingContent}>
        <p className={styles.description}>
          Seamlessly autofill forms with your saved information and intelligent suggestions.
        </p>

        <div className={styles.scrollContainer}>
          <div className={styles.cardContainer} ref={scrollContainerRef}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  {renderFeatureIcon(feature.icon, feature.color)}
                </div>
                <p className={styles.featureTitle}>
                  {feature.title.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < feature.title.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <div className={styles.scrollGradientLeft}></div>
          <div className={styles.scrollGradientRight}></div>
        </div>

        {authState.error && (
          <div className={styles.errorMessage}>
            {authState.error}
          </div>
        )}
      </main>

      <footer className={styles.landingFooter}>
        <button 
          className={styles.googleButton} 
          onClick={handleSignIn}
          disabled={authState.isLoading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            <path d="M1 1h22v22H1z" fill="none"/>
          </svg>
          <span>{authState.isLoading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>
      </footer>
    </div>
  );
};

// Helper function to render feature icons
function renderFeatureIcon(type: string, color: string): React.ReactNode {
  switch (type) {
    case 'star':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 8L24 16L32 17L26 23L27 31L20 27L13 31L14 23L8 17L16 16L20 8Z" fill={color}/>
          <path d="M20 12L22.5 17L28 17.5L24 21.5L25 27L20 24.5L15 27L16 21.5L12 17.5L17.5 17L20 12Z" fill={color} fillOpacity="0.6"/>
        </svg>
      );
    case 'lock':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="10" y="18" width="20" height="16" rx="2" fill={color}/>
          <path d="M14 18V14C14 10.686 16.686 8 20 8C23.314 8 26 10.686 26 14V18" stroke={color} strokeWidth="3" fill="none"/>
          <circle cx="20" cy="26" r="2" fill="#3B4951"/>
        </svg>
      );
    case 'sparkles':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 8L22 18L32 20L22 22L20 32L18 22L8 20L18 18L20 8Z" fill={color}/>
          <path d="M12 10L13 14L17 15L13 16L12 20L11 16L7 15L11 14L12 10Z" fill={color} fillOpacity="0.7"/>
          <path d="M28 26L29 30L33 31L29 32L28 36L27 32L23 31L27 30L28 26Z" fill={color} fillOpacity="0.7"/>
        </svg>
      );
    case 'click':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M16 8L20 16L16 20L12 16L16 8Z" fill={color}/>
          <rect x="14" y="18" width="12" height="18" rx="2" fill={color} fillOpacity="0.8"/>
          <circle cx="20" cy="27" r="3" fill="#E58D21"/>
        </svg>
      );
    default:
      return null;
  }
}