/**
 * Simple in-memory rate limiter for API requests per user
 * In production, you might want to use Redis or a database
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store: userId -> RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_REQUESTS_PER_MINUTE = 5; // Very conservative limit
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Checks if a user has exceeded their rate limit
 * @param userId The user identifier (from session)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetTime) {
    // No entry or window expired, create new window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(userId, newEntry);
    
    // Clean up old entries periodically
    if (rateLimitStore.size > 1000) {
      cleanupOldEntries();
    }

    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_MINUTE - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(userId, entry);

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_MINUTE - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Cleans up expired rate limit entries
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  for (const [userId, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(userId);
    }
  }
}

/**
 * Gets rate limit info for a user without incrementing
 */
export function getRateLimitInfo(userId: string): {
  remaining: number;
  resetTime: number;
} {
  const entry = rateLimitStore.get(userId);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return {
      remaining: MAX_REQUESTS_PER_MINUTE,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  return {
    remaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - entry.count),
    resetTime: entry.resetTime,
  };
}
