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

export class SubscanClient {
  private baseUrl: string
  private headers: Record<string, string>
  private queue: PQueue
  private rateLimitInfo: RateLimitInfo = {}

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

    // Initialize queue with conservative defaults
    // These will be dynamically adjusted based on response headers
    this.queue = new PQueue({
      concurrency: 5, // Max 5 concurrent requests
      interval: 1000, // Per 1 second
      intervalCap: 5, // Max 5 requests per interval
    })
  }

  /**
   * Updates rate limit info from response headers and dynamically adjusts queue settings
   * Based on Subscan API documentation: https://support.subscan.io/doc-362600
   */
  private updateRateLimits(response: Response): void {
    const limit = response.headers.get('ratelimit-limit')
    const remaining = response.headers.get('ratelimit-remaining')
    const reset = response.headers.get('ratelimit-reset')

    if (limit) this.rateLimitInfo.limit = Number.parseInt(limit)
    if (remaining) this.rateLimitInfo.remaining = Number.parseInt(remaining)
    if (reset) this.rateLimitInfo.reset = Number.parseInt(reset)

    // Dynamically adjust queue concurrency based on remaining capacity
    if (this.rateLimitInfo.remaining !== undefined && this.rateLimitInfo.limit !== undefined) {
      const remainingPercent = this.rateLimitInfo.remaining / this.rateLimitInfo.limit

      if (remainingPercent < 0.2) {
        // Less than 20% remaining - slow down significantly
        this.queue.concurrency = 2
      } else if (remainingPercent < 0.5) {
        // Less than 50% remaining - moderate slowdown
        this.queue.concurrency = 3
      } else {
        // Plenty of quota - use default settings
        this.queue.concurrency = 5
      }
    }
  }

  /**
   * Makes a request with rate limiting, queueing, and automatic retries
   * Implements backoff strategy as recommended by Subscan API documentation
   */
  async request<T extends SubscanBaseResponse, B extends Record<string, unknown>>(endpoint: string, body: B): Promise<T> {
    const requestId = `${endpoint}-${Date.now()}`

    return this.queue.add(() =>
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
            this.updateRateLimits(response)

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

            // For other errors (network errors, JSON parsing errors, etc.)
            // wrap them and mark them as non-retryable by using a 400 status
            throw new SubscanError(
              error instanceof Error ? error.message : 'Unknown error',
              0,
              400 // 4xx errors won't be retried
            )
          }
        },
        {
          retries: 5,
          minTimeout: 1000, // Minimum 1 second between retries
          maxTimeout: 60000, // Maximum 60 seconds between retries
          factor: 2, // Exponential backoff factor
          onFailedAttempt: async (error: any) => {
            // p-retry wraps the original error in error.error property
            const subscanError = error.error
            // p-retry adds retriesLeft to the error
            const retriesLeft = error.retriesLeft || 0

            if (subscanError instanceof SubscanError) {
              if (subscanError.httpStatus === 429) {
                // If we have a retry-after value from 429 response, use it
                if (subscanError.retryAfter) {
                  await new Promise(resolve => setTimeout(resolve, subscanError.retryAfter))
                }
              }
            }

            if (retriesLeft === 0) {
              console.warn('[Subscan API] All retry attempts exhausted, request will fail')
            }
          },
          // Only retry on rate limit (429) or server errors (5xx)
          shouldRetry: (error: any) => {
            const subscanError = error.error
            if (subscanError instanceof SubscanError) {
              const willRetry = subscanError.httpStatus === 429 || subscanError.httpStatus >= 500
              return willRetry
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
    return { ...this.rateLimitInfo }
  }

  /**
   * Gets queue statistics
   * Useful for monitoring and debugging
   */
  getQueueStats() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      concurrency: this.queue.concurrency,
    }
  }
}
