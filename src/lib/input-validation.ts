// ============================================================================
// INPUT VALIDATION & SANITIZATION
// Prevent XSS, injection, and malformed data
// ============================================================================

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and trims whitespace
 * NO LENGTH LIMIT - users should be able to share their full story
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove potential XSS vectors
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  
  // Remove data: URLs (potential XSS vector)
  sanitized = sanitized.replace(/data\s*:/gi, '');
  
  return sanitized;
}

/**
 * Validate and sanitize thought/note input
 * NO LENGTH LIMIT - users should be able to share their full story
 */
export function validateThought(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Input must be a string' };
  }

  if (input.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Input cannot be empty' };
  }

  // NO LENGTH LIMIT - let users share their full story
  const sanitized = sanitizeString(input);
  return { valid: true, sanitized };
}

/**
 * Validate session ID (UUID format)
 */
export function validateSessionId(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Session ID must be a string' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input)) {
    return { valid: false, sanitized: '', error: 'Invalid session ID format' };
  }

  return { valid: true, sanitized: input.toLowerCase() };
}

/**
 * Validate mood value (1-5)
 */
export function validateMoodValue(input: unknown): { valid: boolean; value: number; error?: string } {
  const num = Number(input);
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Mood must be a number' };
  }

  if (num < 1 || num > 5) {
    return { valid: false, value: 0, error: 'Mood must be between 1 and 5' };
  }

  return { valid: true, value: Math.round(num) };
}

/**
 * Validate emotion string
 */
const VALID_EMOTIONS = [
  'anxious', 'sad', 'angry', 'ashamed', 'exhausted',
  'confused', 'disappointed', 'inadequate', 'unsettled'
];

export function validateEmotion(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Emotion must be a string' };
  }

  const normalized = input.toLowerCase().trim();
  
  if (!VALID_EMOTIONS.includes(normalized)) {
    return { valid: false, sanitized: '', error: 'Invalid emotion value' };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validate distortion type
 */
const VALID_DISTORTIONS = [
  'Catastrophizing', 'All-or-Nothing Thinking', 'Mind Reading',
  'Fortune Telling', 'Emotional Reasoning', 'Should Statements',
  'Labeling', 'Personalization', 'Mental Filtering', 'Overgeneralization',
  'Negative Thought Pattern'
];

export function validateDistortion(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Distortion must be a string' };
  }

  if (!VALID_DISTORTIONS.includes(input)) {
    return { valid: false, sanitized: '', error: 'Invalid distortion type' };
  }

  return { valid: true, sanitized: input };
}

/**
 * Validate iceberg layer
 */
const VALID_LAYERS = ['surface', 'trigger', 'emotion', 'coreBelief'];

export function validateIcebergLayer(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Layer must be a string' };
  }

  if (!VALID_LAYERS.includes(input)) {
    return { valid: false, sanitized: '', error: 'Invalid iceberg layer' };
  }

  return { valid: true, sanitized: input };
}

/**
 * Validate password strength (for dashboard)
 */
export function validatePassword(input: unknown): { valid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }

  if (input.length < 1 || input.length > 100) {
    return { valid: false, error: 'Invalid password length' };
  }

  // Basic sanitization - remove newlines
  if (input.includes('\n') || input.includes('\r')) {
    return { valid: false, error: 'Invalid characters in password' };
  }

  return { valid: true };
}

/**
 * Validate title input
 * NO LENGTH LIMIT - titles can be as descriptive as needed
 */
export function validateTitle(input: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, sanitized: '', error: 'Title must be a string' };
  }

  if (input.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Title cannot be empty' };
  }

  const sanitized = sanitizeString(input);
  return { valid: true, sanitized };
}
