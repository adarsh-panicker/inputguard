/**
 * InputGuard Constants
 */

// Risk levels and their visual styling
export const RISK_LEVELS = {
  SAFE: {
    level: 'safe',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    icon: '✅',
    label: 'Safe',
  },
  CAUTION: {
    level: 'caution',
    color: '#eab308',
    bgColor: '#fefce8',
    borderColor: '#fde047',
    icon: '⚠️',
    label: 'Caution',
  },
  WARNING: {
    level: 'warning',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fdba74',
    icon: '⚠️',
    label: 'Warning',
  },
  DANGER: {
    level: 'danger',
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    icon: '🔴',
    label: 'Danger',
  },
};

// PII type labels for user display
export const PII_LABELS = {
  ssn: 'Social Security Number',
  credit_card: 'Credit Card Number',
  phone: 'Phone Number',
  email: 'Email Address',
  address: 'Physical Address',
  name: 'Full Name',
  dob: 'Date of Birth',
  password: 'Password',
  api_key: 'API Key / Token',
  financial: 'Financial Data',
  medical: 'Medical Information',
  other: 'Sensitive Data',
};

// Form field types that typically contain sensitive data
export const SENSITIVE_FIELD_TYPES = [
  'password', 'tel', 'email', 'number',
];

// Form field names that suggest sensitive data collection
export const SENSITIVE_FIELD_NAMES = [
  'ssn', 'social_security', 'sin', 'tax_id', 'tin',
  'credit_card', 'card_number', 'cc_number', 'cvv', 'cvc',
  'dob', 'date_of_birth', 'birthday',
  'income', 'salary', 'revenue',
  'passport', 'driver_license', 'license_number',
  'bank_account', 'routing_number', 'iban', 'swift',
  'medical', 'diagnosis', 'prescription',
  'mother_maiden', 'security_question',
];

// Message types for chrome.runtime messaging
export const MSG = {
  ANALYZE_PII: 'ANALYZE_PII',
  ANALYZE_FORM: 'ANALYZE_FORM',
  ANALYZE_SITE: 'ANALYZE_SITE',
  GET_PAGE_STATS: 'GET_PAGE_STATS',
  UPDATE_BADGE: 'UPDATE_BADGE',
  PII_RESULT: 'PII_RESULT',
  FORM_RESULT: 'FORM_RESULT',
  SITE_RESULT: 'SITE_RESULT',
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
};

// Debounce delay for input monitoring (ms)
export const INPUT_DEBOUNCE_MS = 500;

// Minimum text length to trigger PII analysis
export const MIN_ANALYSIS_LENGTH = 5;
