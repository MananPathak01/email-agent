import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private config: RateLimitConfig) {}

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.getClientKey(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanup();

    const clientData = this.requests.get(key);
    
    if (!clientData || now > clientData.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return next();
    }

    if (clientData.count >= this.config.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: this.config.message || 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    // Increment request count
    clientData.count++;
    this.requests.set(key, clientData);
    next();
  };

  private getClientKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.uid;
    return userId || req.ip || 'anonymous';
  }

  private cleanup(): void {
    const now = Date.now();
    this.requests.forEach((data, key) => {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    });
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Strict rate limit for sync triggers (1 per minute)
  strict: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1,
    message: 'Sync can only be triggered once per minute'
  }),

  // Moderate rate limit for activity updates (10 per minute)
  moderate: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many activity updates'
  }),

  // Standard rate limit for general endpoints (100 per minute)
  standard: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests'
  })
};

export default RateLimiter; 