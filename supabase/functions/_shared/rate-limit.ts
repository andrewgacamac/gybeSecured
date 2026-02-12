import { RateLimitError } from './errors.ts';

interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset: number;
}

/**
 * Upstash Redis rate limiter
 */
export class RateLimiter {
    private redisUrl: string;
    private redisToken: string;

    constructor() {
        this.redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
        this.redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
    }

    /**
     * Check rate limit for an identifier (e.g., IP address)
     * @param identifier - Unique identifier (IP, user ID, etc.)
     * @param limit - Max requests allowed
     * @param windowSeconds - Time window in seconds
     */
    async checkLimit(
        identifier: string,
        limit: number = 10,
        windowSeconds: number = 60
    ): Promise<RateLimitResult> {
        if (!this.redisUrl || !this.redisToken) {
            // Skip rate limiting if Redis not configured
            console.warn('Rate limiting disabled: Redis not configured');
            return { success: true, remaining: limit, reset: 0 };
        }

        const key = `ratelimit:${identifier}`;
        const now = Math.floor(Date.now() / 1000);
        const windowStart = now - windowSeconds;

        try {
            // Use Redis sorted set for sliding window rate limiting
            const pipeline = [
                ['ZREMRANGEBYSCORE', key, '0', windowStart.toString()],
                ['ZADD', key, now.toString(), `${now}:${crypto.randomUUID()}`],
                ['ZCARD', key],
                ['EXPIRE', key, windowSeconds.toString()],
            ];

            const response = await fetch(`${this.redisUrl}/pipeline`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.redisToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pipeline),
            });

            const results = await response.json();
            const count = results[2]?.result || 0;
            const remaining = Math.max(0, limit - count);

            return {
                success: count <= limit,
                remaining,
                reset: now + windowSeconds,
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            // Fail open - allow request if Redis is down
            return { success: true, remaining: limit, reset: 0 };
        }
    }

    /**
     * Enforce rate limit - throws if exceeded
     */
    async enforce(
        identifier: string,
        limit: number = 10,
        windowSeconds: number = 60
    ): Promise<void> {
        const result = await this.checkLimit(identifier, limit, windowSeconds);
        if (!result.success) {
            throw new RateLimitError(
                `Rate limit exceeded. Try again in ${result.reset - Math.floor(Date.now() / 1000)} seconds`
            );
        }
    }
}

export const rateLimiter = new RateLimiter();
