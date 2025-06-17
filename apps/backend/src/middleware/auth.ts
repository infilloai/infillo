import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../models/User';

// JWT Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: Error, user: IUser) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid or expired token',
      });
      return;
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Authorization middleware - check user role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - No user found',
      });
      return;
    }

    if (!roles.includes((req.user as IUser).role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden - Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: Error, user: IUser) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
}; 