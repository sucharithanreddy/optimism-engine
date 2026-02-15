// ============================================================================
// RATE LIMITING - Prevent API Abuse
// Uses in-memory store (for production, consider Redis)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  blockDurationMs: number; // How long to block after exceeding
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now && !entry.blocked) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // AI endpoint - strict limits (expensive API calls)
  reframe: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 10,            // 10 requests per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  },
  // Session creation - moderate limits
  session: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 20,            // 20 sessions per minute
    blockDurationMs: 60 * 1000, // 1 minute block
  },
  // Messages - moderate limits
  messages: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 30,            // 30 messages per minute
    blockDurationMs: 2 * 60 * 1000, // 2 minute block
  },
  // Dashboard auth - strict limits (prevent brute force)
  dashboard: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    maxRequests: 5,             // 5 attempts per 15 min
    blockDurationMs: 30 * 60 * 1000, // 30 minute block
  },
  // Default for other endpoints
  default: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 60,            // 60 requests per minute
    blockDurationMs: 60 * 1000, // 1 minute block
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate limited
 * @param identifier - IP address or user ID
 * @param type - Rate limit configuration type
 * @returns Object with allowed status and retry-after time
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): { allowed: boolean; retryAfter: number; remaining: number } {
  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If blocked, check if block has expired
  if (entry?.blocked) {
    if (entry.resetTime > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        remaining: 0,
      };
    } else {
      // Block expired, reset
      entry = undefined;
    }
  }

  // No entry or window expired - create new
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    });
    return {
      allowed: true,
      retryAfter: 0,
      remaining: config.maxRequests - 1,
    };
  }

  // Within window - increment count
  entry.count++;

  // Check if exceeded
  if (entry.count > config.maxRequests) {
    entry.blocked = true;
    entry.resetTime = now + config.blockDurationMs;
    rateLimitStore.set(key, entry);

    return {
      allowed: false,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
      remaining: 0,
    };
  }

  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.maxRequests - entry.count,
  };
}

/**
 * Get client identifier for rate limiting
 * Uses X-Forwarded-For or falls back to x-real-ip or 'unknown'
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP if multiple (client IP)
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - should not happen in production
  return 'unknown';
}
