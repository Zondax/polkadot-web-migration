import PQueue from 'p-queue'
import pRetry from 'p-retry'

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
    public httpStatus: number,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'SubscanError'
  }
}

interface RateLimitInfo {
  limit?: number
  remaining?: number
  reset?: number
}

/**
 * Shared queue manager to ensure rate limiting works across all SubscanClient instances.
 * This is critical because Subscan rate limits are global (shared across all APIs, networks, and IPs).
 * Without a shared queue, multiple client instances would each have their own queue,
 * causing them to exceed rate limits when making concurrent requests.
 */
class SharedQueueManager {
  private static instance: SharedQueueManager
  private queue: PQueue
  private rateLimitInfo: RateLimitInfo = {}
  private hasApiKey = false

  private constructor() {
    // Start with conservative settings (no API key assumed)
    // Will be upgraded when first client with API key is created
    this.queue = new PQueue({
      concurrency: 1,
      interval: 500,
      intervalCap: 1,
    })
  }

  static getInstance(): SharedQueueManager {
    if (!SharedQueueManager.instance) {
      SharedQueueManager.instance = new SharedQueueManager()
    }
    return SharedQueueManager.instance
  }

  /**
   * Resets the singleton instance. Only for testing purposes.
   * @internal
   */
  static resetInstance(): void {
    // Clear the queue before resetting
    if (SharedQueueManager.instance) {
      SharedQueueManager.instance.queue.clear()
    }
    SharedQueueManager.instance = undefined as unknown as SharedQueueManager
  }

  /**
   * Upgrades the queue settings when an API key is provided.
   * Once upgraded, we use higher limits (5 req/s per Subscan free plan).
   */
  upgradeForApiKey(): void {
    if (this.hasApiKey) return // Already upgraded

    this.hasApiKey = true
    // Reconfigure queue for authenticated requests
    // Note: PQueue doesn't support changing interval after creation,
    // so we create a new queue (existing queued items will complete on old queue)
    this.queue = new PQueue({
      concurrency: 5,
      interval: 1000,
      intervalCap: 5,
    })
  }

  getQueue(): PQueue {
    return this.queue
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  updateRateLimits(response: Response): void {
    const limit = response.headers.get('ratelimit-limit')
    const remaining = response.headers.get('ratelimit-remaining')
    const reset = response.headers.get('ratelimit-reset')

    if (limit) this.rateLimitInfo.limit = Number.parseInt(limit)
    if (remaining) this.rateLimitInfo.remaining = Number.parseInt(remaining)
    if (reset) this.rateLimitInfo.reset = Number.parseInt(reset)

    // Only dynamically adjust concurrency if we have an API key
    if (!this.hasApiKey) return

    if (this.rateLimitInfo.remaining !== undefined && this.rateLimitInfo.limit !== undefined && this.rateLimitInfo.limit > 0) {
      const remainingPercent = this.rateLimitInfo.remaining / this.rateLimitInfo.limit

      if (remainingPercent < 0.2) {
        this.queue.concurrency = 2
      } else if (remainingPercent < 0.5) {
        this.queue.concurrency = 3
      } else {
        this.queue.concurrency = 5
      }
    }
  }

  hasApiKeyConfigured(): boolean {
    return this.hasApiKey
  }
}

export class SubscanClient {
  private baseUrl: string
  private headers: Record<string, string>
  private queueManager: SharedQueueManager

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

    // Use the shared queue manager to ensure rate limiting works across all client instances
    // This is critical because Subscan rate limits are global
    this.queueManager = SharedQueueManager.getInstance()

    // Upgrade queue settings if API key is provided
    if (config.apiKey) {
      this.queueManager.upgradeForApiKey()
    }
  }

  /**
   * Makes a request with rate limiting, queueing, and automatic retries
   * Implements backoff strategy as recommended by Subscan API documentation
   */
  async request<T extends SubscanBaseResponse, B extends Record<string, unknown>>(endpoint: string, body: B): Promise<T> {
    const requestId = `${endpoint}-${Date.now()}`

    return this.queueManager.getQueue().add(() =>
      pRetry(
        async attemptNumber => {
          let response: Response | undefined

          try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
              method: 'POST',
              headers: this.headers,
              body: JSON.stringify(body),
            })

            if (!response) {
              throw new Error('No response received from fetch')
            }

            // Update rate limit tracking from response headers
            this.queueManager.updateRateLimits(response)

            // Handle HTTP errors
            if (!response.ok) {
              if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after')
                const retryMs = retryAfter ? Number.parseInt(retryAfter) * 1000 : undefined

                console.warn(
                  `[Subscan API] 429 Rate Limit HIT - Request ${requestId} - Attempt #${attemptNumber} - Retrying after ${retryMs}ms`
                )

                throw new SubscanError('Rate limit exceeded', 10003, 429, retryMs)
              }

              const errorText = await response.text()
              throw new SubscanError(`HTTP error! status: ${response.status}, error: ${errorText}`, 0, response.status)
            }

            const data: T = await response.json()

            // Handle Subscan API error codes
            if (data.code !== 0) {
              const httpStatus = this.getHttpStatusFromSubscanCode(data.code)

              throw new SubscanError(data.message, data.code, httpStatus)
            }

            return data
          } catch (error) {
            // If it's already a SubscanError, just rethrow it
            if (error instanceof SubscanError) {
              throw error
            }

            // For network errors (connection failures, timeouts, etc.)
            // wrap them with 503 status to allow retries since these are typically transient
            throw new SubscanError(
              error instanceof Error ? error.message : 'Unknown error',
              0,
              503 // Service unavailable - will be retried
            )
          }
        },
        {
          retries: 5,
          minTimeout: 1000, // Minimum 1 second between retries
          maxTimeout: 60000, // Maximum 60 seconds between retries
          factor: 2, // Exponential backoff factor
          onFailedAttempt: (error: any) => {
            // p-retry adds retriesLeft to the error
            const retriesLeft = error.retriesLeft || 0

            if (retriesLeft === 0) {
              console.warn('[Subscan API] All retry attempts exhausted, request will fail')
            }
          },
          // Only retry on rate limit (429) or specific server errors (502, 503, 504)
          // Note: 500 (Internal Server Error) and 501 (Not Implemented) are not retryable
          // as they typically indicate server-side bugs rather than transient issues
          shouldRetry: (error: any) => {
            const subscanError = error.error
            if (subscanError instanceof SubscanError) {
              const status = subscanError.httpStatus
              const isRetryable = status === 429 || status === 502 || status === 503 || status === 504
              return isRetryable
            }
            return false // Don't retry on other errors
          },
        }
      )
    ) as Promise<T>
  }

  /**
   * Gets current rate limit information
   * Useful for monitoring and debugging
   */
  getRateLimitInfo(): RateLimitInfo {
    return this.queueManager.getRateLimitInfo()
  }

  /**
   * Gets queue statistics
   * Useful for monitoring and debugging
   */
  getQueueStats() {
    const queue = this.queueManager.getQueue()
    return {
      size: queue.size,
      pending: queue.pending,
      concurrency: queue.concurrency,
    }
  }
}

/**
 * Resets the shared queue manager singleton. Only for testing purposes.
 * @internal
 */
export function resetSharedQueueManager(): void {
  SharedQueueManager.resetInstance()
}
