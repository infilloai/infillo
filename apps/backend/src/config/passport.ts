import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User';
import config from './env';
import logger from '../utils/logger';

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub).select('-password -refreshTokens');
        
        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        logger.error('JWT Strategy error:', error);
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
      passReqToCallback: false,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails?.[0]?.value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.avatar = profile.photos?.[0]?.value || user.avatar;
          user.isEmailVerified = true;
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          isEmailVerified: true,
          lastLogin: new Date(),
        });

        return done(null, user);
      } catch (error) {
        logger.error('Google Strategy error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize/Deserialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id).select('-password -refreshTokens');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport; 