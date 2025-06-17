# InfilloAI Chrome Extension

Your intelligent form-filling assistant. A modern Chrome extension built with **complete CSS isolation** using Shadow DOM and native CSS modules. This extension follows Chrome Extension Manifest V3 best practices and global standards.

## 🎯 Key Features

- **Smart Form Detection**: Automatically detects form fields on any webpage
- **Secure Data Storage**: Your personal information is encrypted and stored locally
- **AI-Powered Suggestions**: Intelligent field matching and autofill recommendations
- **One-Click Autofill**: Fill entire forms instantly with saved profiles
- **Complete CSS Isolation**: Uses Shadow DOM and CSS modules to ensure zero interference with webpage styles
- **Manifest V3 Compliance**: Built for the latest Chrome extension standards
- **TypeScript**: Full type safety throughout the codebase
- **React Integration**: Modern React 18 with proper isolation

## 🏗️ Architecture

### CSS Isolation Strategy

The extension implements **complete CSS isolation** through multiple layers:

1. **Shadow DOM**: All content script UI is rendered inside closed Shadow DOM
2. **CSS Modules**: Popup and components use CSS modules with scoped class names
3. **CSS Reset**: Complete reset of inherited styles within Shadow DOM
4. **No External CSS**: All styles are bundled and scoped to prevent leakage

### Project Structure

```
src/
├── background/          # Service worker (Manifest V3)
├── content/            # Content scripts with Shadow DOM isolation
├── popup/              # Extension popup UI
├── components/         # Reusable React components
├── utils/              # Utility functions and CSS isolation
├── types/              # TypeScript type definitions
└── setupTests.ts       # Test configuration
```

### Core Components

#### CSS Isolation (`src/utils/cssIsolation.ts`)
- Creates isolated containers with Shadow DOM
- Provides complete CSS reset
- Generates scoped class names
- Prevents style inheritance

#### Content Script (`src/content/index.ts`)
- Injects extension UI with complete isolation
- Communicates with background script
- Monitors DOM changes to maintain isolation

#### Background Service (`src/background/index.ts`)
- Manifest V3 service worker
- Handles extension lifecycle events
- Manages storage and settings
- Provides context menus

#### Popup Interface (`src/popup/`)
- React-based popup UI
- CSS modules for scoped styles
- Real-time communication with content scripts

## 🚀 Development

### Prerequisites

```bash
Node.js 18+
npm or yarn
```

### Installation

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test

# Create distributable ZIP
npm run build:zip
```

### Loading in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## 🔒 Security Features

### Content Security Policy
- Strict CSP preventing XSS attacks
- Inline styles only within Shadow DOM
- No eval() or unsafe inline scripts

### Permissions
- Minimal required permissions
- Host permissions limited to development URLs
- Storage access for settings only

### Data Isolation
- All extension data stored separately
- No access to webpage localStorage
- Secure communication channels

## 🎨 CSS Isolation Details

### Shadow DOM Implementation

```typescript
// Complete isolation using closed Shadow DOM
const { container, shadowRoot } = CSSIsolation.createIsolatedContainer({
  styles: extensionStyles,
});

// Styles are completely isolated from page
shadowRoot.appendChild(uiContent);
```

### CSS Reset Strategy

```css
/* Complete reset within Shadow DOM */
* {
  all: unset;
  display: revert;
  box-sizing: border-box;
}

:host {
  all: initial;
  contain: layout style paint size;
  isolation: isolate;
}
```

### Scoped Class Names

- CSS modules generate unique class names
- No global CSS pollution
- Predictable styling behavior

## 📦 Build Configuration

### Webpack Features
- CSS modules with scoped names
- PostCSS with modern CSS features
- Code splitting for optimal loading
- Asset optimization

### TypeScript Configuration
- Strict type checking
- Path aliases for clean imports
- Chrome extension type definitions

## 🧪 Testing

The extension includes comprehensive testing setup:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Test Features
- Chrome API mocking
- React component testing
- CSS module support
- Isolated test environment

## 🔧 Extension Features

### Popup Interface
- Settings management
- Theme switching (light/dark)
- Current tab information
- Extension status control

### Content Script
- Isolated UI injection
- Page data extraction
- Real-time communication
- DOM change monitoring

### Background Service
- Extension lifecycle management
- Storage synchronization
- Context menu integration
- Tab monitoring

## 📋 Best Practices Implemented

### Chrome Extension Standards
- Manifest V3 compliance
- Service worker architecture
- Proper permission management
- Secure communication patterns

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Consistent code formatting
- Comprehensive error handling

### Performance
- Lazy loading
- Code splitting
- Optimized bundle size
- Efficient DOM manipulation

### Security
- CSP compliance
- XSS prevention
- Secure storage
- Input validation

## 🚀 Deployment

### Building for Production

```bash
# Create production build
npm run build

# Verify build output
ls -la dist/

# Create ZIP for Chrome Web Store
npm run build:zip
```

### Chrome Web Store

1. Ensure all required icons are in `public/icons/`
2. Update version in `package.json` and `manifest.json`
3. Build production version: `npm run build`
4. Create ZIP: `npm run build:zip`
5. Upload to Chrome Web Store Developer Dashboard

## 🤝 Contributing

1. Follow the established code style
2. Add tests for new features
3. Update documentation
4. Ensure CSS isolation is maintained

## 📝 License

[Your License Here]

---

**InfilloAI** - Your intelligent form-filling assistant  
Built with ❤️ using modern web technologies and best practices for Chrome extension development. 