import { useState, useCallback } from 'react';

interface FormState {
  [key: string]: string | number | boolean;
}

interface FormErrors {
  [key: string]: string;
}

export function useFormState<T extends FormState>(initialState: T) {
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field as string]) {
      setErrors(prev => {
        const { [field as string]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const touchField = useCallback((field: keyof T) => {
    setTouched(prev => new Set(prev).add(field as string));
  }, []);

  const reset = useCallback(() => {
    setValues(initialState);
    setErrors({});
    setTouched(new Set());
    setIsSubmitting(false);
  }, [initialState]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void) => {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
        reset();
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, reset]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    touchField,
    reset,
    handleSubmit,
  };
} 