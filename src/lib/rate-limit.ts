/**
 * Simple in-memory rate limiter for API routes.
 * In production, use Redis or a dedicated rate limiting service.
 */

const requests = new Map<string, { count: number; resetAt: number }>()

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of requests) {
    if (val.resetAt < now) requests.delete(key)
  }
}, 60_000)

interface RateLimitConfig {
  /** Max requests per window */
  max: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig = { max: 30, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowMs
    requests.set(key, { count: 1, resetAt })
    return { success: true, remaining: config.max - 1, resetAt }
  }

  entry.count++
  if (entry.count > config.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { success: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}
