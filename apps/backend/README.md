# Infillo AI Backend API

A secure, intelligent backend API for the Infillo AI Chrome extension that provides contextual form-filling, document processing, and conversational AI features.

## Features

- 🔐 **Google OAuth2 Authentication** with JWT tokens
- 📄 **Document Processing** - Upload and extract entities from PDF, DOCX, and TXT files
- ☁️ **Dynamic Storage Providers** - Switch between Google Cloud Storage, AWS S3, Azure (extensible)
- 🧠 **Dynamic AI Providers** - Switch between Google AI (Gemini), OpenAI, Anthropic (extensible)
- 🔍 **Semantic Search** - Vector-based search using MongoDB Atlas
- 💬 **Conversational AI** - Chat interface with streaming support (SSE)
- 📊 **Form Templates & History** - Save and reuse form structures
- 🎯 **Smart Autofill** - AI-suggested values based on user context
- 📈 **Learning System** - Improve accuracy through user feedback

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Atlas Vector Search
- **Storage**: Dynamic provider system (Google Cloud Storage, AWS S3*, Azure*)
- **AI/ML**: Dynamic provider system (Google Generative AI, OpenAI*, Anthropic*)
- **Authentication**: Passport.js with Google OAuth2, JWT
- **File Processing**: PDF-Parse, Mammoth (DOCX)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

*Coming soon

## Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Google Cloud Console account for OAuth2, AI APIs, and Cloud Storage

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Google Cloud Storage Setup**:
   - Create a Google Cloud Storage bucket
   - Enable the Cloud Storage API
   - Create a service account with Storage Admin permissions
   - Download the service account key file

3. **Environment Variables**:
   Create a `.env` file in the backend directory with:
   ```env
   # Server
   NODE_ENV=development
   PORT=5000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/infilloai

   # JWT Secrets
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   JWT_EXPIRE=900
   JWT_REFRESH_EXPIRE=604800

   # Session
   SESSION_SECRET=your-session-secret

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=BASE_URL/api/auth/google/callback

   # Google AI
   GOOGLE_AI_API_KEY=your-gemini-api-key
   GOOGLE_LANGUAGE_API_KEY=your-language-api-key # Optional

   # Google Cloud Storage
   GCS_BUCKET_NAME=your-bucket-name
   GCS_PROJECT_ID=your-project-id
   GCS_KEY_FILENAME=path/to/service-account-key.json # Optional if using ADC

   # Client URLs
   CLIENT_URL=
   EXTENSION_URL=chrome-extension://your-extension-id

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # File Upload
   MAX_FILE_SIZE=10485760

   # Logging
   LOG_LEVEL=info

   # Providers (optional - defaults to google)
   STORAGE_PROVIDER=google # Options: google, aws (coming soon), azure (coming soon)
   AI_PROVIDER=google # Options: google, openai (coming soon), anthropic (coming soon)

   # Google AI Model Configuration (optional)
   GOOGLE_AI_MODEL=gemini-pro
   GOOGLE_EMBEDDING_MODEL=embedding-001
   ```

4. **MongoDB Atlas Vector Search Setup**:
   - Create a search index named `vector_index` on the `usercontexts` collection
   - Configure with 768 dimensions for embeddings

5. **Run the server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth2 login |
| GET | `/api/auth/google/callback` | Handle Google OAuth callback |
| GET | `/api/auth/me` | Get authenticated user profile |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout current session |
| POST | `/api/auth/logout-all` | Logout from all devices |

### 👤 User Context

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/context` | Create/update context data |
| GET | `/api/user/context` | List all user contexts |
| GET | `/api/user/context/:id` | Get specific context |
| PUT | `/api/user/context/:id` | Update context |
| DELETE | `/api/user/context/:id` | Delete context |
| POST | `/api/user/context/search` | Semantic search contexts |

### 📄 Document Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/context/upload` | Upload document (PDF/DOCX/TXT) to GCS |
| GET | `/api/context/` | List uploaded documents with signed URLs |
| GET | `/api/context/:id` | Get document details with download URL |
| GET | `/api/context/:id/status` | Check processing status |
| DELETE | `/api/context/:id` | Delete document from DB and GCS |
| GET | `/api/context/entities/all` | Get all extracted entities |

### 🧠 Form Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/forms/detect` | Analyze HTML and detect fields |
| POST | `/api/forms/autofill` | Get AI-suggested values |
| POST | `/api/forms/submit` | Save form submission |
| GET | `/api/forms/history` | Get form history |
| GET | `/api/forms/:formId` | Get specific form |
| POST | `/api/forms/:formId/feedback` | Add correction feedback |
| POST | `/api/forms/field/explain` | Explain field suggestion |
| POST | `/api/forms/field/refine` | Refine field value |
| POST | `/api/forms/template` | Save form template |
| GET | `/api/forms/templates` | List templates |
| GET | `/api/forms/stats` | Get accuracy statistics |

### 💬 Chat Interface

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send chat message |
| POST | `/api/chat/message/stream` | Stream response (SSE) |
| GET | `/api/chat/session/:sessionId/history` | Get chat history |
| GET | `/api/chat/sessions` | List recent sessions |
| POST | `/api/chat/session/:sessionId/end` | End chat session |
| POST | `/api/chat/form-assistance` | Get form-specific help |

## Request/Response Examples

### Create User Context
```bash
POST /api/user/context
Authorization: Bearer <token>

{
  "key": "LinkedIn Profile",
  "value": "https://linkedin.com/in/johndoe",
  "tags": ["professional", "social"]
}
```

### Upload Document
```bash
POST /api/context/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: resume.pdf
tags: resume,professional
```

Response includes GCS URL and signed download URL:
```json
{
  "success": true,
  "message": "Document uploaded and processing started",
  "data": {
    "fileName": "resume.pdf",
    "fileSize": 102400,
    "mimeType": "application/pdf",
    "gcsUrl": "gs://infilloai-uploads/uploads/userId/1234567890-resume.pdf"
  }
}
```

### Get Autofill Suggestions
```bash
POST /api/forms/autofill
Authorization: Bearer <token>

{
  "fields": [
    {
      "name": "full_name",
      "label": "Full Name",
      "type": "text"
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email"
    }
  ],
  "formContext": "job application"
}
```

### Chat Message (Streaming)
```javascript
const eventSource = new EventSource('/api/chat/message/stream', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.chunk);
};
```

## Google Cloud Storage Configuration

### Service Account Setup
1. Create a service account in Google Cloud Console
2. Grant the following roles:
   - Storage Object Admin
   - Storage Object Viewer
3. Generate and download a JSON key file

### Bucket Configuration
1. Create a bucket with a unique name
2. Configure CORS if needed:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "responseHeader": ["*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

### Authentication Options
- **Service Account Key**: Set `GCS_KEY_FILENAME` to the path of your key file
- **Application Default Credentials**: If running on Google Cloud, ADC will be used automatically

## Security Features

- **Authentication**: Google OAuth2 + JWT (access & refresh tokens)
- **Authorization**: Role-based access control
- **File Storage**: Secure Google Cloud Storage with signed URLs
- **Rate Limiting**: Configurable per-window request limits
- **Input Validation**: Zod schemas for all endpoints
- **File Upload**: Type and size restrictions
- **CORS**: Configured for extension and web client
- **Helmet**: Security headers
- **HTTPS**: Required in production

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Error Handling

All API responses follow this format:

```json
{
  "success": true/false,
  "data": {...},
  "message": "Success/Error message",
  "error": "Error details (dev only)"
}
```

## Rate Limits

Default rate limits:
- 100 requests per 15 minutes per IP
- File uploads: 10MB max size
- Streaming: 50ms delay between chunks
- Signed URLs: 60 minutes expiration

## Vector Search

The API uses MongoDB Atlas Vector Search for semantic similarity:
- 768-dimensional embeddings (Google AI)
- Cosine similarity scoring
- Minimum score threshold: 0.7

## Logging

Uses Winston for structured logging:
- Console output in development
- File output in production
- Log levels: error, warn, info, debug

## Contributing

1. Follow TypeScript best practices
2. Add validation for new endpoints
3. Include error handling
4. Update documentation
5. Add tests for new features

## Dynamic Provider System

The backend uses a provider pattern that allows switching between different storage and AI providers at runtime.

### Available Providers

**Storage Providers:**
- `google` - Google Cloud Storage (implemented)
- `aws` - Amazon S3 (coming soon)
- `azure` - Azure Blob Storage (coming soon)
- `local` - Local file storage (coming soon)

**AI Providers:**
- `google` - Google Generative AI / Gemini (implemented)
- `openai` - OpenAI GPT models (coming soon)
- `anthropic` - Anthropic Claude (coming soon)
- `azure` - Azure OpenAI (coming soon)

### Provider Configuration

Set default providers via environment variables:
```env
STORAGE_PROVIDER=google
AI_PROVIDER=google
```

### Provider Management API

**Get Current Providers:**
```bash
GET /api/providers/current
Authorization: Bearer <token>
```

**Get Available Providers:**
```bash
GET /api/providers/available
Authorization: Bearer <token>
```

**Switch Storage Provider (Admin Only):**
```bash
POST /api/providers/storage/switch
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "aws"
}
```

**Switch AI Provider (Admin Only):**
```bash
POST /api/providers/ai/switch
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "openai"
}
```

### Extending Providers

To add a new storage provider:

1. Create a new provider class implementing `IStorageProvider`:
```typescript
// src/providers/storage/S3StorageProvider.ts
export class S3StorageProvider implements IStorageProvider {
  // Implement all required methods
}
```

2. Add it to the factory:
```typescript
// src/providers/storage/StorageProviderFactory.ts
case 'aws':
case 's3':
  provider = new S3StorageProvider(config);
  break;
```

To add a new AI provider:

1. Create a new provider class implementing `IAIProvider`:
```typescript
// src/providers/ai/OpenAIProvider.ts
export class OpenAIProvider implements IAIProvider {
  // Implement all required methods
}
```

2. Add it to the factory:
```typescript
// src/providers/ai/AIProviderFactory.ts
case 'openai':
  provider = new OpenAIProvider(config);
  break;
``` 