interface SubscanClientConfig {
  network: string
  apiKey?: string
}

interface SubscanBaseResponse {
  code: number
  message: string
  generated_at: number
}

export class SubscanError extends Error {
  constructor(
    message: string,
    public subscanCode: number,
    public httpStatus: number
  ) {
    super(message)
    this.name = 'SubscanError'
  }
}

/**
 * Rate limiter using queue-based approach
 * Ensures we don't exceed maxRequestsPerSecond even with concurrent requests
 */
class RateLimiter {
  private requestTimestamps: number[] = []
  private readonly maxRequestsPerSecond: number
  private readonly windowMs: number
  private queue: Array<() => void> = []
  private processing = false

  constructor(maxRequestsPerSecond: number) {
    this.maxRequestsPerSecond = maxRequestsPerSecond
    this.windowMs = 1000 // 1 second window
  }

  /**
   * Wait if necessary to respect rate limit, then record the request
   * Uses a queue to prevent race conditions with concurrent requests
   */
  async waitForSlot(): Promise<void> {
    // Add to queue and wait for our turn
    await new Promise<void>(resolve => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()

      // Remove timestamps older than 1 second
      this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < this.windowMs)

      // If we've hit the limit, wait until the oldest request expires
      if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
        const oldestTimestamp = this.requestTimestamps[0]
        const waitTime = this.windowMs - (now - oldestTimestamp) + 50 // +50ms buffer

        if (waitTime > 0) {
          console.log(
            `[RateLimiter] Rate limit reached (${this.requestTimestamps.length}/${this.maxRequestsPerSecond}). Waiting ${waitTime}ms`
          )
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue // Recheck after waiting
        }
      }

      // We have a slot available, release the next request in queue
      const resolve = this.queue.shift()
      if (resolve) {
        this.requestTimestamps.push(Date.now())
        resolve()
      }
    }

    this.processing = false
  }
}

export class SubscanClient {
  private baseUrl: string
  private headers: Record<string, string>
  private baseRetryDelayMs = 1000
  private maxRetryDelayMs = 30000 // Cap at 30 seconds

  // Global rate limiter shared across ALL instances
  // Using 4 req/s instead of 5 to have safety margin
  private static readonly globalRateLimiter = new RateLimiter(4)

  private getHttpStatusFromSubscanCode(code: number): number {
    switch (code) {
      case 10004: // Record Not Found
        return 404
      case 10001: // Invalid parameter
      case 10002: // Invalid format
        return 400
      case 10003: // Rate limit exceeded
        return 429
      default:
        return 500 // Internal server error for unknown codes
    }
  }

  constructor(config: SubscanClientConfig) {
    this.baseUrl = `https://${config.network}.api.subscan.io/api/v2`
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'X-API-Key': config.apiKey }),
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * to avoid thundering herd problem when multiple requests retry simultaneously
   */
  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc., capped at maxRetryDelayMs
    const exponentialDelay = Math.min(this.baseRetryDelayMs * 2 ** attempt, this.maxRetryDelayMs)
    // Add random jitter (0-50% of delay) to spread out retries
    const jitter = Math.random() * exponentialDelay * 0.5
    return exponentialDelay + jitter
  }

  /**
   * Handle rate limit retry: log, wait, and increment attempt counter
   */
  private async handleRateLimitRetry(endpoint: string, attempt: number): Promise<void> {
    const delay = this.getRetryDelay(attempt)
    console.warn(`[SubscanClient] Rate limit exceeded. Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1})`)
    await this.sleep(delay)
    console.log(`[SubscanClient] Retrying request to ${endpoint} after rate limit`)
  }

  async request<T extends SubscanBaseResponse, B extends Record<string, unknown>>(endpoint: string, body: B): Promise<T> {
    let attempt = 0

    // Keep retrying indefinitely until we get a non-429 response
    while (true) {
      try {
        // Wait for rate limiter slot before making request
        await SubscanClient.globalRateLimiter.waitForSlot()

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new SubscanError(`HTTP error! status: ${response.status}, error: ${errorText}`, 0, response.status)

          // Retry indefinitely on 429
          if (response.status === 429) {
            await this.handleRateLimitRetry(endpoint, attempt)
            attempt++
            continue
          }

          throw error
        }

        const data: T = await response.json()

        if (data.code !== 0) {
          const httpStatus = this.getHttpStatusFromSubscanCode(data.code)
          const error = new SubscanError(data.message, data.code, httpStatus)

          // Retry indefinitely on rate limit (Subscan code 10003)
          if (httpStatus === 429) {
            await this.handleRateLimitRetry(endpoint, attempt)
            attempt++
            continue
          }

          throw error
        }

        return data
      } catch (error) {
        // If it's a network error or other unexpected error, don't retry
        if (!(error instanceof SubscanError)) {
          throw error
        }
        // If it's not a 429 error, throw immediately
        if (error.httpStatus !== 429) {
          throw error
        }
        // If it is a 429 error, continue to next iteration
        attempt++
      }
    }
  }
}
