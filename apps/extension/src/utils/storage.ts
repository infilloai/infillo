/**
 * Extension Storage Utility
 * Provides type-safe interface for Chrome extension storage
 */

export interface ExtensionSettings {
  enabled: boolean;
  autoAnalyze: boolean;
  theme: 'light' | 'dark';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isEmailVerified: boolean;
  lastLogin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthData {
  user: User;
  tokens: AuthTokens;
}

export interface StorageData {
  settings: ExtensionSettings;
  userPreferences: Record<string, any>;
  cache: Record<string, any>;
  authData?: AuthData;
}

export class ExtensionStorage {
  private static readonly STORAGE_KEYS = {
    SETTINGS: 'settings',
    USER_PREFERENCES: 'userPreferences',
    CACHE: 'cache',
    AUTH_DATA: 'authData',
  } as const;

  /**
   * Get all settings from storage
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS);
      return result.settings || this.getDefaultSettings();
    } catch (error) {
      console.error('Error getting settings from storage:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update settings in storage
   */
  static async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.SETTINGS]: updatedSettings,
      });
    } catch (error) {
      console.error('Error updating settings in storage:', error);
      throw error;
    }
  }

  /**
   * Get user preferences from storage
   */
  static async getUserPreferences(): Promise<Record<string, any>> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEYS.USER_PREFERENCES);
      return result.userPreferences || {};
    } catch (error) {
      console.error('Error getting user preferences from storage:', error);
      return {};
    }
  }

  /**
   * Update user preferences in storage
   */
  static async updateUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.USER_PREFERENCES]: updatedPreferences,
      });
    } catch (error) {
      console.error('Error updating user preferences in storage:', error);
      throw error;
    }
  }

  /**
   * Get cache data from local storage
   */
  static async getCache(): Promise<Record<string, any>> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.CACHE);
      return result.cache || {};
    } catch (error) {
      console.error('Error getting cache from storage:', error);
      return {};
    }
  }

  /**
   * Update cache data in local storage
   */
  static async updateCache(cacheData: Record<string, any>): Promise<void> {
    try {
      const currentCache = await this.getCache();
      const updatedCache = { ...currentCache, ...cacheData };
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CACHE]: updatedCache,
      });
    } catch (error) {
      console.error('Error updating cache in storage:', error);
      throw error;
    }
  }

  /**
   * Clear specific cache entries
   */
  static async clearCache(keys?: string[]): Promise<void> {
    try {
      if (keys) {
        const cache = await this.getCache();
        keys.forEach(key => delete cache[key]);
        await this.updateCache(cache);
      } else {
        await chrome.storage.local.remove(this.STORAGE_KEYS.CACHE);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get a specific value from storage
   */
  static async getValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key] ?? defaultValue;
    } catch (error) {
      console.error(`Error getting value for key '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Set a specific value in storage
   */
  static async setValue(key: string, value: any): Promise<void> {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      console.error(`Error setting value for key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Remove a specific key from storage
   */
  static async removeValue(key: string): Promise<void> {
    try {
      await chrome.storage.sync.remove(key);
    } catch (error) {
      console.error(`Error removing value for key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Clear all extension data from storage
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        chrome.storage.sync.clear(),
        chrome.storage.local.clear(),
      ]);
    } catch (error) {
      console.error('Error clearing all storage:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    sync: { used: number; quota: number };
    local: { used: number; quota: number };
  }> {
    try {
      const [syncInfo, localInfo] = await Promise.all([
        chrome.storage.sync.getBytesInUse(),
        chrome.storage.local.getBytesInUse(),
      ]);

      return {
        sync: {
          used: syncInfo,
          quota: chrome.storage.sync.QUOTA_BYTES,
        },
        local: {
          used: localInfo,
          quota: chrome.storage.local.QUOTA_BYTES,
        },
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw error;
    }
  }

  /**
   * Listen for storage changes
   */
  static onChanged(callback: (changes: Record<string, chrome.storage.StorageChange>) => void): void {
    chrome.storage.onChanged.addListener(callback);
  }

  /**
   * Get authentication data
   */
  static async getAuthData(): Promise<AuthData | null> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.AUTH_DATA);
      return result.authData || null;
    } catch (error) {
      console.error('Failed to get auth data:', error);
      return null;
    }
  }

  /**
   * Set authentication data
   */
  static async setAuthData(authData: AuthData): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.AUTH_DATA]: authData,
      });
    } catch (error) {
      console.error('Failed to set auth data:', error);
      throw error;
    }
  }

  /**
   * Clear authentication data
   */
  static async clearAuthData(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEYS.AUTH_DATA);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with enhanced validation
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return false;

      // Enhanced validation with larger buffer for proactive refresh
      const now = Date.now();
      const bufferTime = 10 * 60 * 1000; // 10 minute buffer (increased from basic check)
      const isValid = now < (authData.tokens.expiresAt - bufferTime);
      
      if (!isValid) {
        console.log(`🔍 Token validation failed: ${Math.round((authData.tokens.expiresAt - now) / 1000 / 60)}min remaining (needs ${bufferTime / 1000 / 60}min buffer)`);
      }

      return isValid;
    } catch (error) {
      console.error('Failed to check auth status:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const authData = await this.getAuthData();
      return authData?.user || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get valid access token with enhanced checking
   */
  static async getValidAccessToken(): Promise<string | null> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return null;

      // More conservative validation - require 5 minute buffer minimum
      const now = Date.now();
      const minBuffer = 5 * 60 * 1000; // 5 minute minimum buffer
      const timeRemaining = authData.tokens.expiresAt - now;
      
      if (timeRemaining <= minBuffer) {
        console.log(`🔍 Token too close to expiry: ${Math.round(timeRemaining / 1000 / 60)}min remaining`);
        return null;
      }

      return authData.tokens.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get time until token expiry
   */
  static async getTokenTimeRemaining(): Promise<number> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return 0;

      return Math.max(0, authData.tokens.expiresAt - Date.now());
    } catch (error) {
      console.error('Failed to get token time remaining:', error);
      return 0;
    }
  }

  /**
   * Check if token needs refresh soon
   */
  static async needsRefreshSoon(): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return false;

      const now = Date.now();
      const tokenLifetime = 15 * 60 * 1000; // Assume 15min lifetime
      const timeRemaining = authData.tokens.expiresAt - now;
      const lifetimeProgress = 1 - (timeRemaining / tokenLifetime);

      return lifetimeProgress >= 0.75; // Needs refresh when 75% of lifetime used
    } catch (error) {
      console.error('Failed to check refresh need:', error);
      return true; // Err on side of caution
    }
  }

  /**
   * Update tokens while preserving user data
   */
  static async updateTokens(tokens: AuthTokens): Promise<void> {
    try {
      const authData = await this.getAuthData();
      if (!authData) {
        throw new Error('No existing auth data to update');
      }

      const updatedAuthData: AuthData = {
        user: authData.user,
        tokens: tokens,
      };

      await this.setAuthData(updatedAuthData);
      console.log('✅ Tokens updated successfully');
    } catch (error) {
      console.error('Failed to update tokens:', error);
      throw error;
    }
  }

  /**
   * Get default settings
   */
  private static getDefaultSettings(): ExtensionSettings {
    return {
      enabled: true,
      autoAnalyze: false,
      theme: 'light',
      position: 'top-right',
    };
  }
} 