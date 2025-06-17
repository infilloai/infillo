// Layout Constants
export const LAYOUT = {
  MAX_WIDTH: {
    FORM: 672,
    RECORDS: 874,
  },
  PADDING: {
    PAGE: 'px-16 py-8',
    CARD: 'p-6',
  },
  HEIGHT: {
    FORM_CARD: 530,
    EMPTY_STATE: 396,
  },
} as const;

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  ENDPOINTS: {
    AUTH: {
      GOOGLE: '/api/auth/google',
      GOOGLE_CALLBACK: '/api/auth/google/callback',
      ME: '/api/auth/me',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      LOGOUT_ALL: '/api/auth/logout-all',
      TRANSFER_STORE: '/api/auth/transfer/store',
      TRANSFER_RETRIEVE: '/api/auth/transfer/retrieve',
    },
    USER_CONTEXT: '/api/user/context',
    DOCUMENTS: '/api/context',
    FORMS: {
      BASE: '/api/forms',
      DETECT: '/api/forms/detect',
      AUTOFILL: '/api/forms/autofill',
      SUBMIT: '/api/forms/submit',
      HISTORY: '/api/forms/history',
      FEEDBACK: '/api/forms/feedback',
      EXPLAIN: '/api/forms/field/explain',
      REFINE: '/api/forms/field/refine',
      TEMPLATE: '/api/forms/template',
      TEMPLATES: '/api/forms/templates',
      STATS: '/api/forms/stats',
    },
    CHAT: {
      BASE: '/api/chat',
      MESSAGE: '/api/chat/message',
      STREAM: '/api/chat/stream',
      HISTORY: '/api/chat/history',
      SESSIONS: '/api/chat/sessions',
      END_SESSION: '/api/chat/session/end',
      ASSISTANCE: '/api/chat/assistance',
    },
    PROVIDERS: {
      BASE: '/api/providers',
      CURRENT: '/api/providers/current',
      AVAILABLE: '/api/providers/available',
      SWITCH_STORAGE: '/api/providers/storage/switch',
      SWITCH_AI: '/api/providers/ai/switch',
    },
    REST: {
      BASE: '/api/rest',
      FILES: '/api/rest/files',
    },
    BLOCKED_ORIGINS: {
      BASE: '/api/blocked-origins',
      CHECK: '/api/blocked-origins/check',
      TOGGLE: '/api/blocked-origins/toggle',
      BLOCK: '/api/blocked-origins/block',
      UNBLOCK: '/api/blocked-origins/unblock',
    },
    STATS: {
      DASHBOARD: '/api/stats/dashboard',
      DETAILED: '/api/stats/detailed',
    },
  },
} as const;

// Authentication Constants
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_tokens',
  USER_KEY: 'auth_user',
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  LOGIN_REDIRECT_KEY: 'login_redirect',
} as const;

// Form Field Types
export const FORM_TABS = {
  CONTACT: 'contact',
  JOB: 'job',
  BANKING: 'banking',
  SHIPPING: 'shipping',
} as const;

// Form Labels and Placeholders
export const FORM_CONTENT = {
  CONTACT: {
    title: 'Contact Information',
    description: 'Fill out this form to see PaperEase suggestions in action',
    fields: {
      firstName: { label: 'First Name', placeholder: 'Enter your first name' },
      lastName: { label: 'Last Name', placeholder: 'Enter your last name' },
      email: { label: 'Email address', placeholder: 'Enter your email address', type: 'email' },
      phone: { label: 'Phone number', placeholder: 'Enter your phone number', type: 'tel' },
      street: { label: 'Street Address', placeholder: 'Enter your street address' },
      city: { label: 'City', placeholder: 'Enter your city' },
      state: { label: 'State', placeholder: 'Enter your state' },
      zip: { label: 'ZIP Code', placeholder: 'Enter ZIP code' },
    },
  },
  JOB: {
    title: 'Job Application',
    description: 'Apply for your desired position with key details',
    fields: {
      // Position Information
      position: { label: 'Position Applied For', placeholder: 'e.g., Software Engineer' },
      company: { label: 'Company Name', placeholder: 'Enter company name' },
      
      // Experience and Qualifications
      experience: { label: 'Years of Experience', placeholder: '5', type: 'number' },
      currentPosition: { label: 'Current Position', placeholder: 'Software Engineer at ABC Corp' },
      salary: { label: 'Expected Salary', placeholder: '$120,000 - $150,000' },
      skills: { label: 'Key Skills', placeholder: 'e.g., React, Node.js, TypeScript, Python, AWS' },
      
      // Cover Letter & Motivation
      coverLetter: { 
        label: 'Cover Letter', 
        placeholder: 'Tell us why you\'re the perfect fit for this role...', 
        type: 'textarea',
        rows: 6
      },
      motivation: { 
        label: 'Why do you want to work here?', 
        placeholder: 'What attracts you to this company and position?', 
        type: 'textarea',
        rows: 3
      },
      
      // Work Details
      availability: { label: 'Available Start Date', placeholder: 'mm/dd/yyyy', type: 'date' },
      workType: { label: 'Work Preference', placeholder: 'Hybrid', type: 'select', options: ['Remote', 'Hybrid', 'On-site', 'No Preference'] },
      
      // Documents
      resume: { label: 'Resume/CV', placeholder: 'Upload your resume', type: 'file', accept: '.pdf,.doc,.docx' },
    },
  },
  BANKING: {
    title: 'Banking Information',
    description: 'Secure banking details for direct deposit and payments',
    fields: {
      bankName: { label: 'Bank Name', placeholder: 'Chase Bank' },
      accountType: { label: 'Account Type', placeholder: 'Checking' },
      accountNumber: { label: 'Account Number', placeholder: '****1234' },
      routingNumber: { label: 'Routing Number', placeholder: '123456789' },
      accountHolder: { label: 'Account Holder Name', placeholder: 'John Doe' },
      branch: { label: 'Branch Location', placeholder: 'New York, NY' },
    },
  },
  SHIPPING: {
    title: 'Shipping Information',
    description: 'Delivery address and shipping preferences',
    fields: {
      fullName: { label: 'Full Name', placeholder: 'John Doe' },
      companyName: { label: 'Company (Optional)', placeholder: 'Company name' },
      shippingAddress: { label: 'Street Address', placeholder: '123 Main Street' },
      apartment: { label: 'Apartment, Suite, Unit (Optional)', placeholder: 'Apt 4B' },
      shippingCity: { label: 'City', placeholder: 'San Francisco' },
      shippingState: { label: 'State', placeholder: 'CA' },
      shippingZip: { label: 'ZIP Code', placeholder: '94107' },
      shippingPhone: { label: 'Phone Number', placeholder: '(555) 123-4567', type: 'tel' },
      instructions: { label: 'Delivery Instructions', placeholder: 'Leave at door' },
    },
  },
} as const;

// Page Content
export const PAGE_CONTENT = {
  HOME: {
    title: 'Demo Forms',
    description: 'Experience PaperEase with these interactive demo forms',
  },
  INFORMATION_RECORDS: {
    title: 'Information Records',
    description: 'Manage your personal information, documents, form history, and settings',
    emptyState: {
      title: 'No saved records',
      description: 'Start by adding your personal details to speed up form filling',
      action: 'Add your first record',
    },
    searchPlaceholder: 'Search information records',
    tabs: {
      PERSONAL: 'personal',
      DOCUMENTS: 'documents', 
      FORMS: 'forms',
      BLOCKED_ORIGINS: 'blocked-origins',
      SETTINGS: 'settings',
    },
  },
} as const; 