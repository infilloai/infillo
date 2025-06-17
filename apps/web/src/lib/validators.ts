// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (supports various formats)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// ZIP code validation (US format)
export const isValidZipCode = (zip: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
};

// Required field validation
export const isRequired = (value: string | number | undefined | null): boolean => {
  return value !== undefined && value !== null && value.toString().trim() !== '';
};

// Minimum length validation
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

// Maximum length validation
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

// Number validation
export const isNumber = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Create validator function
export const createValidator = (rules: {
  required?: boolean;
  email?: boolean;
  phone?: boolean;
  zipCode?: boolean;
  minLength?: number;
  maxLength?: number;
  number?: boolean;
  url?: boolean;
}) => {
  return (value: string): string | undefined => {
    if (rules.required && !isRequired(value)) {
      return 'This field is required';
    }

    if (value && rules.email && !isValidEmail(value)) {
      return 'Please enter a valid email address';
    }

    if (value && rules.phone && !isValidPhone(value)) {
      return 'Please enter a valid phone number';
    }

    if (value && rules.zipCode && !isValidZipCode(value)) {
      return 'Please enter a valid ZIP code';
    }

    if (value && rules.minLength && !hasMinLength(value, rules.minLength)) {
      return `Must be at least ${rules.minLength} characters`;
    }

    if (value && rules.maxLength && !hasMaxLength(value, rules.maxLength)) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    if (value && rules.number && !isNumber(value)) {
      return 'Please enter a valid number';
    }

    if (value && rules.url && !isValidUrl(value)) {
      return 'Please enter a valid URL';
    }

    return undefined;
  };
}; 