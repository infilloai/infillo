import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport';
import config from './config/env';
import logger from './utils/logger';
import { requestLogger, errorLogger, apiRateLimiter } from './middleware/security';

// Import routes
import authRoutes from './routes/auth.routes';
import userContextRoutes from './routes/userContext.routes';
import documentRoutes from './routes/document.routes';
import formRoutes from './routes/form.routes';
import chatRoutes from './routes/chat.routes';
import providerRoutes from './routes/provider.routes';
import restRoutes from './routes/rest.routes';
import blockedOriginRoutes from './routes/blockedOrigin.routes';
import statsRoutes from './routes/stats.routes';

const createApp = (): Application => {
  const app = express();

  // Trust proxy - important for rate limiting and logging
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: [config.client.url, config.client.extensionUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Session configuration
  app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongodb.uri,
      touchAfter: 24 * 3600, // lazy session update
    }),
    cookie: {
      secure: config.env === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: config.env === 'production' ? 'strict' : 'lax',
    },
  }));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use('/api/', apiRateLimiter);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userContextRoutes);
  app.use('/api/context', documentRoutes);
  app.use('/api/forms', formRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/rest', restRoutes);
  app.use('/api/blocked-origins', blockedOriginRoutes);
  app.use('/api/stats', statsRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Resource not found',
      path: req.originalUrl,
    });
  });

  // Error logging
  app.use(errorLogger);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    logger.error('Unhandled error:', {
      error: err,
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
    });

    res.status(statusCode).json({
      success: false,
      message: config.env === 'production' && statusCode === 500 
        ? 'Internal server error' 
        : message,
      ...(config.env === 'development' && {
        error: err,
        stack: err.stack,
      }),
    });
  });

  return app;
};

export default createApp; 