/**
 * Interfaces for Subscan API responses
 */

// Retry constants
const MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY = 5000 // 2 seconds in milliseconds
const MAX_RETRY_AFTER = 10000 // 5 seconds in milliseconds

interface SubscanBaseResponse {
  code: number
  message: string
  generated_at: number
}

export interface SubscanMultisig {
  multi_account: { address: string }[] // Multisig accounts the address is part of
  multi_account_member: { address: string }[] // Members of this multisig account
  threshold: number // Threshold of this multisig account
}

interface SubscanSearchResponse extends SubscanBaseResponse {
  data: {
    account?: {
      address: string
      multisig?: SubscanMultisig
    }
  }
}

/**
 * Parses the Retry-After header from a response
 * @param response The fetch response
 * @returns The delay in milliseconds, or null if no valid header found
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After')
  if (!retryAfter) return null
  
  const seconds = Number.parseInt(retryAfter, 10)
  if (Number.isNaN(seconds)) return null
  
  const milliseconds = seconds * 1000
  return milliseconds <= MAX_RETRY_AFTER ? milliseconds : null
}

/**
 * Sleep for a given number of milliseconds
 * @param ms The number of milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Executes a fetch request with retry logic for 429 (Too Many Requests) errors
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns The fetch response
 * @throws Error if all retries are exhausted or a non-retryable error occurs
 */
async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // If not a 429 error, return the response (success or other error)
      if (response.status !== 429) {
        return response
      }
      
      // If this is the last attempt, don't retry
      if (attempt === MAX_RETRIES) {
        return response
      }
      
      // Calculate delay for retry
      const retryAfterDelay = parseRetryAfter(response)
      const delay = retryAfterDelay ?? DEFAULT_RETRY_DELAY
      
      await sleep(delay)
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // If this is the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw lastError
      }
      
      // Wait before retrying on network errors
      await sleep(DEFAULT_RETRY_DELAY)
    }
  }
  
  // This should never be reached, but included for completeness
  throw lastError ?? new Error('All retry attempts exhausted')
}

/**
 * Makes a POST request to the Subscan API through our API proxy
 * @param network The network name (e.g., 'kusama', 'polkadot')
 * @param endpoint The API endpoint
 * @param body The request body
 * @returns The API response
 * @throws Error if the API call fails
 */
async function subscanPost<T extends SubscanBaseResponse>(network: string, endpoint: string, body: any): Promise<T> {
  const response = await fetchWithRetry(`/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      network,
      address: body.key,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data: T = await response.json()
  return data
}

/**
 * Gets the multisig info for an address
 * @param address The address to check
 * @param network The subscan id of the network (e.g., 'kusama', 'polkadot')
 * @returns The multisig info for the address
 * @throws Error if the API call fails
 */
export async function getMultisigInfo(address: string, network: string): Promise<SubscanMultisig | undefined> {
  const response = await subscanPost<SubscanSearchResponse>(network, '/subscan/search', { key: address })

  // If there's multisig data and it has multi_account array, return it
  if (response.data.account?.multisig) {
    return {
      multi_account: response.data.account.multisig.multi_account,
      multi_account_member: response.data.account.multisig.multi_account_member,
      threshold: response.data.account.multisig.threshold,
    }
  }

  // If no multisig data found, return undefined
  return undefined
}
