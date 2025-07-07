import { uiState$ } from 'state/ui'

/**
 * useTokenLogo
 *
 * Returns the icon object for a given token.
 *
 * @param token - The token object containing a logoId
 * @returns The icon object or undefined if not found
 */
export function useTokenLogo(tokenLogoId: string | undefined): string | undefined {
  if (!tokenLogoId) return undefined
  
  const icons = uiState$.icons.get()
  
  // Handle null/undefined icons
  if (!icons) return undefined
  
  // Handle malformed icons data (should be an object)
  if (typeof icons !== 'object') return undefined
  
  return icons[tokenLogoId]
}
