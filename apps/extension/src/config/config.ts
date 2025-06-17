/**
 * Extension Configuration
 * Centralized configuration for the browser extension
 */

export const config = {
  API_BASE_URL: 'http://localhost:5005',
  WEB_APP_URL: 'http://localhost:3000',
  
  // Add other configuration values as needed
  AUTH: {
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    MAX_RETRY_ATTEMPTS: 3,
  },
  
  STORAGE: {
    AUTH_DATA_KEY: 'authData',
    SETTINGS_KEY: 'settings',
  },
} as const;

// Export individual values for convenience
export const { API_BASE_URL, WEB_APP_URL } = config; 