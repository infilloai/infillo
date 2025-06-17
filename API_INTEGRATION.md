# InfilloAI API Integration Documentation

This document provides comprehensive documentation for the API integrations in both the web application and browser extension.

## Overview

The InfilloAI platform now has complete API integration across all services:

- **Form Management**: Form detection, autofill suggestions, submission tracking, templates
- **User Context**: Personal information management for intelligent form filling
- **Document Processing**: Document upload, text extraction, entity recognition
- **Chat Integration**: AI-powered assistance and form help
- **Provider Management**: AI and storage provider configuration

## Architecture

### API Services

Both web and extension applications use dedicated API service classes:

- **Web App**: `apps/web/src/lib/apiService.ts`
- **Extension**: `apps/extension/src/utils/apiService.ts`

These services provide:
- Consistent interface across applications
- Automatic authentication handling
- Error handling and retry logic
- Type safety with TypeScript

### React Hooks (Web App Only)

Custom React hooks provide easy integration with loading states and error handling:
- Located in `apps/web/src/hooks/useApi.ts`
- Automatic state management
- Built-in pagination support
- Error recovery mechanisms

## API Endpoints

### Authentication APIs
All APIs require authentication using JWT tokens.

```typescript
// Get current user
const user = await apiService.getCurrentUser();

// Check authentication status
const isAuth = await authService.isAuthenticated();
```

### Form APIs

#### Form Detection
Detect form fields from HTML content:

```typescript
// Web App
const { detectFields, isLoading, error } = useFormDetection();
const fields = await detectFields(htmlContent);

// Extension
const fields = await apiService.detectFormFields(htmlContent);
```

#### Autofill Suggestions
Get intelligent suggestions for form fields:

```typescript
// Web App
const { getSuggestions } = useAutofillSuggestions();
const suggestions = await getSuggestions(formFields, formContext);

// Extension
const suggestions = await apiService.getAutofillSuggestions(formFields, formContext);
```

#### Form Submission Tracking

```typescript
// Save form submission
const submission = await apiService.saveFormSubmission({
  formId: 'unique-form-id',
  fields: detectedFields,
  filledValues: { email: 'user@example.com', name: 'John Doe' },
  domain: 'example.com',
  url: 'https://example.com/contact'
});

// Get form history
const { history, pagination } = useFormHistory({ page: 1, limit: 10 });
```

#### Form Templates

```typescript
// Save template
const template = await apiService.saveFormTemplate(
  'Contact Form Template',
  formFields,
  'example.com'
);

// Get templates
const templates = await apiService.getFormTemplates('example.com');
```

#### Form Statistics

```typescript
const { stats, isLoading } = useFormStats();
// stats: { totalForms, avgAccuracy, totalCorrections, improvementRate }
```

### User Context APIs

Manage user's personal information for intelligent form filling:

```typescript
// Create context
const context = await apiService.createUserContext({
  content: 'John Doe, Software Engineer at TechCorp',
  contextType: 'professional',
  tags: ['work', 'contact'],
  metadata: { department: 'Engineering' }
});

// Search contexts
const contexts = await apiService.searchUserContexts('software engineer');

// Web App Hook
const { 
  contexts, 
  createContext, 
  updateContext, 
  deleteContext 
} = useUserContexts();
```

### Document APIs

Handle document upload and processing:

```typescript
// Upload document
const result = await apiService.uploadDocument(file, 'resume, personal');

// Get documents with status
const { documents, isUploading } = useDocuments({ status: 'completed' });

// Track processing status
const status = await apiService.getDocumentStatus(documentId);

// Get extracted entities
const entities = await apiService.getExtractedEntities('person');
```

### Chat APIs

AI-powered assistance and form help:

```typescript
// Send message
const response = await apiService.sendMessage(
  'Help me fill out this job application', 
  sessionId
);

// Stream message (web only)
const { streamMessage } = useChat();
await streamMessage(message, sessionId, (chunk) => {
  console.log('Received:', chunk);
});

// Get form assistance
const assistance = await apiService.getFormAssistance({
  formFields: detectedFields,
  userQuery: 'Help me with my contact information',
  formContext: { type: 'job_application' }
});
```

### Provider APIs

Manage AI and storage providers (admin only):

```typescript
// Get current configuration
const { config, available } = useProviders();

// Switch providers
await apiService.switchAIProvider('openai-gpt4');
await apiService.switchStorageProvider('google-cloud');
```

## Error Handling

All API services include comprehensive error handling:

```typescript
try {
  const result = await apiService.someMethod();
  // Handle success
} catch (error) {
  if (error.status === 401) {
    // Handle authentication error
    await authService.logout();
  } else if (error.status === 429) {
    // Handle rate limiting
    console.log('Rate limited, retry after:', error.retryAfter);
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

### Hook Error States

React hooks automatically handle error states:

```typescript
const { data, isLoading, error, refetch } = useFormHistory();

if (error) {
  return (
    <div className="error">
      <p>Error: {error}</p>
      <button onClick={refetch}>Retry</button>
    </div>
  );
}
```

## Loading States

### Manual Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await apiService.saveFormSubmission(data);
  } finally {
    setIsLoading(false);
  }
};
```

### Hook Loading States

```typescript
const { 
  isLoading,        // General loading
  isUploading,      // File upload loading
  isSaving,         // Save operation loading
  isGeneratingSuggestions  // AI processing loading
} = useDocuments();
```

## Usage Examples

### Complete Form Integration

```typescript
// 1. Detect form fields
const fields = await apiService.detectFormFields(pageHTML);

// 2. Get autofill suggestions
const suggestions = await apiService.getAutofillSuggestions(fields);

// 3. Apply suggestions and collect user input
const filledValues = applyUserSelections(suggestions);

// 4. Save form submission
await apiService.saveFormSubmission({
  fields,
  filledValues,
  domain: window.location.hostname,
  url: window.location.href
});
```

### Document-Based Form Filling

```typescript
// 1. Upload resume/CV
await apiService.uploadDocument(resumeFile, 'resume, cv');

// 2. Wait for processing
let status = await apiService.getDocumentStatus(documentId);
while (status.status === 'processing') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  status = await apiService.getDocumentStatus(documentId);
}

// 3. Get extracted entities
const entities = await apiService.getExtractedEntities();

// 4. Use entities for form suggestions
const suggestions = await apiService.getAutofillSuggestions(
  formFields, 
  { documentEntities: entities }
);
```

### AI-Assisted Form Filling

```typescript
// Get AI assistance for complex forms
const assistance = await apiService.getFormAssistance({
  formFields: detectedFields,
  userQuery: 'This is a job application for a senior developer position',
  formContext: { 
    type: 'job_application',
    position: 'Senior Developer',
    company: 'TechCorp'
  }
});

// Apply AI suggestions
assistance.suggestions.forEach(suggestion => {
  // Apply suggestion to form
});
```

## Configuration

### Environment Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=

# Extension
REACT_APP_API_URL=
```

### API Timeouts

```typescript
// Configure timeouts in API service
const API_TIMEOUT = 30000; // 30 seconds

// Large file uploads
const UPLOAD_TIMEOUT = 300000; // 5 minutes
```

## Best Practices

### 1. Error Handling
Always handle errors gracefully and provide user feedback:

```typescript
try {
  await apiService.method();
  showSuccessMessage('Operation completed successfully');
} catch (error) {
  showErrorMessage(`Failed: ${error.message}`);
  logError('API_ERROR', error);
}
```

### 2. Loading States
Show appropriate loading indicators:

```typescript
if (isLoading) return <LoadingSpinner />;
if (isUploading) return <UploadProgress progress={uploadProgress} />;
```

### 3. Optimistic Updates
Update UI optimistically when possible:

```typescript
// Update UI immediately
updateUIOptimistically(newData);

try {
  await apiService.saveData(newData);
} catch (error) {
  // Revert UI on error
  revertUIChanges();
  showError(error.message);
}
```

### 4. Caching
Use appropriate caching strategies:

```typescript
// Cache user contexts for quick access
const contextCache = new Map();

const getCachedContext = async (id: string) => {
  if (contextCache.has(id)) {
    return contextCache.get(id);
  }
  
  const context = await apiService.getUserContext(id);
  contextCache.set(id, context);
  return context;
};
```

### 5. Pagination
Handle pagination efficiently:

```typescript
const { 
  data, 
  pagination, 
  fetchMore 
} = useFormHistory({ limit: 20 });

// Load more data
const loadMore = () => {
  if (pagination.page < pagination.totalPages) {
    fetchMore({ page: pagination.page + 1 });
  }
};
```

## Security Considerations

### 1. Token Management
- Tokens are automatically refreshed before expiration
- Secure storage in localStorage (web) and chrome.storage (extension)
- Automatic logout on authentication errors

### 2. Data Validation
- All API inputs are validated on both client and server
- Sanitization of HTML content for form detection
- File type and size validation for uploads

### 3. Error Information
- Error messages don't expose sensitive information
- Detailed errors logged for debugging
- User-friendly error messages in UI

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```typescript
   // Check if user is authenticated
   const isAuth = await authService.isAuthenticated();
   if (!isAuth) {
     // Redirect to login
   }
   ```

2. **Network Errors**
   ```typescript
   // Implement retry logic
   const retryRequest = async (fn: Function, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

3. **File Upload Issues**
   ```typescript
   // Check file size and type
   if (file.size > 10 * 1024 * 1024) {
     throw new Error('File too large (max 10MB)');
   }
   
   const allowedTypes = ['application/pdf', 'text/plain'];
   if (!allowedTypes.includes(file.type)) {
     throw new Error('Unsupported file type');
   }
   ```

## Development

### Adding New API Endpoints

1. Add endpoint to backend routes
2. Update API service with new method
3. Add TypeScript types if needed
4. Create React hook if applicable
5. Update documentation

### Testing API Integration

```typescript
// Mock API service for testing
jest.mock('@/lib/apiService', () => ({
  apiService: {
    getFormHistory: jest.fn().mockResolvedValue({
      data: mockFormHistory,
      pagination: mockPagination
    })
  }
}));
```

This comprehensive API integration provides a robust foundation for the InfilloAI platform, enabling seamless form filling experiences powered by AI and intelligent data management. 