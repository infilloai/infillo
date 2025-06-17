import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import config from '../config/env';
import logger from '../utils/logger';

// Rate limiter configuration
export const createRateLimiter = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    },
  });
};

// Auth rate limiter - stricter limits
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes

// API rate limiter - standard limits
export const apiRateLimiter = createRateLimiter();

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`
    );
  });

  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: err.stack,
  });

  next(err);
}; 