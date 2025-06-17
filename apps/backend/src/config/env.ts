import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
  };
  providers: {
    storage: string;
    ai: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expire: number;
    refreshExpire: number;
  };
  session: {
    secret: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    aiApiKey: string;
    languageApiKey?: string;
    cloudStorage: {
      bucketName: string;
      projectId?: string;
      keyFilename?: string;
      credentialsJson?: string;
    };
  };
  client: {
    url: string;
    extensionUrl: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || '',
  },
  providers: {
    storage: process.env.STORAGE_PROVIDER || 'google',
    ai: process.env.AI_PROVIDER || 'google',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expire: parseInt(process.env.JWT_EXPIRE || '2592000', 10), // 30 days in seconds
    refreshExpire: parseInt(process.env.JWT_REFRESH_EXPIRE || '7776000', 10), // 90 days in seconds
  },
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    aiApiKey: process.env.GOOGLE_AI_API_KEY || '',
    languageApiKey: process.env.GOOGLE_LANGUAGE_API_KEY,
    cloudStorage: {
      bucketName: process.env.GCS_BUCKET_NAME || 'infilloai-uploads',
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILENAME,
      credentialsJson: process.env.GCS_CREDENTIALS_JSON,
    },
  },
  client: {
    url: process.env.CLIENT_URL || '',
    extensionUrl: process.env.EXTENSION_URL || 'chrome-extension://localhost',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  },
};

// Validate required environment variables in production
if (config.env === 'production') {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_AI_API_KEY',
    'MONGODB_URI',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export default config; 