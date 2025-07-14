/**
 * Interfaces for Subscan API responses
 */

interface SubscanBaseResponse {
  code: number
  message: string
  generated_at: number
}

export interface SubscanMultisig {
  multi_account: { address: string }[]
  multi_account_member: { address: string }[]
  threshold: number
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
 * Makes a POST request to the Subscan API through our API proxy
 * @param network The network name (e.g., 'kusama', 'polkadot')
 * @param endpoint The API endpoint
 * @param body The request body
 * @returns The API response
 * @throws Error if the API call fails
 */
async function subscanPost<T extends SubscanBaseResponse>(network: string, endpoint: string, body: any): Promise<T> {
  const response = await fetch(`/api/${endpoint}`, {
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
