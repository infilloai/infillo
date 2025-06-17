import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import User, { IUser } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import config from '../config/env';
import logger from '../utils/logger';

// Google OAuth initiation
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

// Google OAuth callback
export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: Error, user: IUser) => {
    if (err || !user) {
      logger.error('Google authentication failed:', err);
      return res.redirect(`${config.client.url}/auth/error?message=Authentication failed`);
    }

    try {
      // Generate tokens
      const { accessToken, refreshToken } = generateTokenPair(user);

      // Store refresh token
      user.refreshTokens.push({
        token: refreshToken,
        createdAt: new Date(),
      });

      // Clean up old tokens
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${config.client.url}/`);
      redirectUrl.searchParams.append('accessToken', accessToken);
      redirectUrl.searchParams.append('refreshToken', refreshToken);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Token generation error:', error);
      res.redirect(`${config.client.url}/auth/error?message=Token generation failed`);
    }
  })(req, res, next);
};

// Google OAuth for Chrome Extension
export const googleExtensionAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleToken, userInfo } = req.body;

    if (!googleToken || !userInfo) {
      res.status(400).json({
        success: false,
        error: 'Google token and user info are required',
      });
      return;
    }

    // Verify the Google token (optional but recommended)
    try {
      const tokenVerifyResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleToken}`
      );
      const tokenInfo = await tokenVerifyResponse.json();
      
      if (!tokenInfo.email || tokenInfo.email !== userInfo.email) {
        res.status(400).json({
          success: false,
          error: 'Invalid token or email mismatch',
        });
        return;
      }
    } catch (verifyError) {
      logger.warn('Token verification failed:', verifyError);
      // Continue with authentication even if verification fails
    }

    // Find or create user in database
    let user = await User.findOne({ email: userInfo.email });
    
    if (!user) {
      user = new User({
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.id,
        isEmailVerified: true, // Google emails are pre-verified
      });
      await user.save();
      logger.info(`New user created via extension: ${userInfo.email}`);
    } else {
      // Update user info if needed
      let updated = false;
      if (user.name !== userInfo.name) {
        user.name = userInfo.name;
        updated = true;
      }
      if (user.avatar !== userInfo.picture) {
        user.avatar = userInfo.picture;
        updated = true;
      }
      if (!user.googleId && userInfo.id) {
        user.googleId = userInfo.id;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Generate our app's tokens
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Store refresh token
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
    });

    // Clean up old tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.avatar,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        },
      },
    });

  } catch (error) {
    logger.error('Extension OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Refresh token endpoint
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.sub);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      (tokenObj) => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Remove old refresh token
    user.refreshTokens = user.refreshTokens.filter(
      (tokenObj) => tokenObj.token !== refreshToken
    );

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Store new refresh token
    user.refreshTokens.push({
      token: tokens.refreshToken,
      createdAt: new Date(),
    });

    // Clean up old tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

// Logout endpoint
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user as IUser;

    if (refreshToken && user) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        (tokenObj) => tokenObj.token !== refreshToken
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

// Logout from all devices
export const logoutAll = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;

    // Clear all refresh tokens
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

// Get current user
export const getMe = async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}; 

// In-memory store for temporary auth transfers (in production, use Redis)
const transferStore = new Map<string, {
  authData: any;
  expiresAt: number;
  used: boolean;
}>();

// Clean up expired transfers every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of transferStore.entries()) {
    if (now > value.expiresAt || value.used) {
      transferStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Store auth data for extension-to-web transfer
export const storeTransferData = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Generate secure transfer ID
    const transferId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    // Get fresh tokens for the user
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    // Store in temporary store with 5-minute expiration
    transferStore.set(transferId, {
      authData: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.avatar,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin || new Date().toISOString(),
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        },
      },
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes for transfer
      used: false,
    });

    // Update user's refresh tokens
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
    });

    // Clean up old tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    logger.info(`Auth transfer stored for user ${user.email}, transferId: ${transferId}`);

    res.json({
      success: true,
      data: {
        transferId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
    });

  } catch (error) {
    logger.error('Store transfer data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store transfer data',
    });
  }
};

// Retrieve auth data for web app
export const retrieveTransferData = async (req: Request, res: Response) => {
  try {
    const { transferId } = req.body;

    if (!transferId) {
      res.status(400).json({
        success: false,
        error: 'Transfer ID is required',
      });
      return;
    }

    // Get transfer data
    const transferData = transferStore.get(transferId);

    if (!transferData) {
      res.status(404).json({
        success: false,
        error: 'Transfer not found or expired',
      });
      return;
    }

    // Check if expired
    if (Date.now() > transferData.expiresAt) {
      transferStore.delete(transferId);
      res.status(410).json({
        success: false,
        error: 'Transfer expired',
      });
      return;
    }

    // Check if already used
    if (transferData.used) {
      transferStore.delete(transferId);
      res.status(410).json({
        success: false,
        error: 'Transfer already used',
      });
      return;
    }

    // Mark as used and return data
    transferData.used = true;
    
    logger.info(`Auth transfer retrieved, transferId: ${transferId}`);

    res.json({
      success: true,
      data: transferData.authData,
    });

    // Clean up immediately after use
    setTimeout(() => {
      transferStore.delete(transferId);
    }, 1000);

  } catch (error) {
    logger.error('Retrieve transfer data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transfer data',
    });
  }
}; 