# InfilloAI Monorepo

A modern, secure monorepo project with Express backend, Next.js web app, and Chrome extension.

## Architecture

- **Backend**: Express.js with TypeScript, MongoDB, Google OAuth 2.0
- **Web**: Next.js 14 with TypeScript, TailwindCSS, React Query
- **Extension**: Chrome Extension (Manifest V3) with React and TypeScript

## Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or cloud instance)
- pnpm package manager
- Google OAuth credentials

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Setup**
   
   Create `.env` file in `apps/backend/`:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/infilloai
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   SESSION_SECRET=your-session-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=BASE_URL/api/auth/google/callback
   ```

   Create `.env.local` file in `apps/web/`:
   ```env
   NEXT_PUBLIC_API_URL=
   ```

3. **Google OAuth Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `BASE_URL/api/auth/google/callback`

## Development

Run all apps in development mode:
```bash
pnpm dev
```

Run specific apps:
```bash
# Backend
pnpm --filter @infilloai/backend dev

# Web
pnpm --filter @infilloai/rest dev

# Extension
pnpm --filter @infilloai/extension dev
```

## Building

Build all apps:
```bash
pnpm build
```

## Project Structure

```
├── apps/
│   ├── backend/         # Express.js API server
│   ├── web/            # Next.js web application
│   └── extension/      # Chrome extension
├── packages/           # Shared packages (future)
├── package.json        # Root package.json
├── pnpm-workspace.yaml # pnpm workspace config
└── turbo.json         # Turborepo config
```

## Security Features

- JWT authentication with refresh tokens
- Google OAuth 2.0 integration
- Rate limiting
- Helmet.js security headers
- CORS protection
- Input validation
- XSS protection
- HTTPS enforcement (production)
- Content Security Policy

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `GET /api/auth/me` - Get current user

## Tech Stack

### Backend
- Express.js
- TypeScript
- MongoDB with Mongoose
- Passport.js (Google OAuth)
- JWT authentication
- Winston logging
- Express Rate Limit
- Helmet.js

### Web
- Next.js 14
- TypeScript
- TailwindCSS
- React Query
- Zustand
- React Hook Form
- Zod validation

### Extension
- Manifest V3
- React
- TypeScript
- Webpack
- TailwindCSS

## License

MIT 