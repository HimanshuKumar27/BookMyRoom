// ============================================================
// Infrastructure — Rate Limiting Services
// ============================================================

/**
 * Creates a rate limiter that tracks action counts per time window.
 * Uses localStorage to persist across page reloads.
 * 
 * @param {string} key - Unique identifier for this rate limit
 * @param {number} maxAttempts - Max attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds (default: 1 min)
 */
export function createRateLimiter(key, maxAttempts, windowMs = 60000) {
  const storageKey = `rateLimit_${key}`;

  function getState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { attempts: 0, windowStart: Date.now() };
      return JSON.parse(raw);
    } catch {
      return { attempts: 0, windowStart: Date.now() };
    }
  }

  function setState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to set rate limit state in localStorage:', e);
    }
  }

  return {
    /**
     * Check if the action is allowed. Returns { allowed, remaining, retryAfterMs }
     */
    check() {
      const state = getState();
      const now = Date.now();

      // Reset window if expired
      if (now - state.windowStart > windowMs) {
        const newState = { attempts: 1, windowStart: now };
        setState(newState);
        return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
      }

      // Within window — check count
      if (state.attempts >= maxAttempts) {
        const retryAfterMs = windowMs - (now - state.windowStart);
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      // Increment
      state.attempts += 1;
      setState(state);
      return { allowed: true, remaining: maxAttempts - state.attempts, retryAfterMs: 0 };
    },

    /**
     * Reset the rate limiter
     */
    reset() {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to reset rate limit in localStorage:', e);
      }
    },

    /**
     * Get remaining time in the current window (in seconds)
     */
    getRemainingTime() {
      const state = getState();
      const elapsed = Date.now() - state.windowStart;
      const remaining = Math.max(0, windowMs - elapsed);
      return Math.ceil(remaining / 1000);
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  login: createRateLimiter('login', 20, 60000),          // 20 attempts per 1 min
  register: createRateLimiter('register', 10, 300000),   // 10 attempts per 5 min
  booking: createRateLimiter('booking', 20, 60000),      // 20 bookings per 1 min
  adminAction: createRateLimiter('adminAction', 100, 60000), // 100 actions per min
  seedData: createRateLimiter('seedData', 10, 3600000),  // 10 seeds per hour
};
