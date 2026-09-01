/**
 * Shared Form Validation Utilities for RunZone SaaS Forms
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateRequired = (value: any, fieldLabel: string = 'This field'): string | null => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldLabel} is required`;
  }
  return null;
};

export const validateEmailField = (email: string): string | null => {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePasswordField = (password: string, isNewAccount: boolean = false): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (isNewAccount && password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return null;
};

export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldLabel: string
): string | null => {
  if (isNaN(value) || value === null || value === undefined) {
    return `${fieldLabel} is required`;
  }
  if (value < min) {
    return `${fieldLabel} must be at least ${min}`;
  }
  if (value > max) {
    return `${fieldLabel} cannot exceed ${max}`;
  }
  return null;
};
