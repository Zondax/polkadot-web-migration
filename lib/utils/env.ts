/**
 * Environment variable validation utilities
 */

/**
 * Valid node environment values
 */
type NodeEnv = 'development' | 'production' | 'test'

/**
 * Validates and returns the NODE_ENV with a safe default
 */
export function getNodeEnv(): NodeEnv {
  const env = process.env.NEXT_PUBLIC_NODE_ENV?.toLowerCase()

  if (env === 'development' || env === 'production' || env === 'test') {
    return env
  }

  // Default to production for safety
  console.warn('[env] Invalid NEXT_PUBLIC_NODE_ENV value, defaulting to production:', env)
  return 'production'
}

/**
 * Safely parses an integer from environment variable with validation
 */
export function getIntegerFromEnv(
  envKey: string,
  value: string | undefined,
  defaultValue?: number,
  options?: { min?: number; max?: number }
): number | undefined {
  if (!value) {
    return defaultValue ?? undefined
  }

  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) {
    console.warn(`[env] Invalid integer value for ${envKey}, using default:`, value)
    return defaultValue
  }

  if (options?.min !== undefined && parsed < options.min) {
    console.warn(`[env] Value for ${envKey} below minimum (${options.min}), using default:`, parsed)
    return defaultValue
  }

  if (options?.max !== undefined && parsed > options.max) {
    console.warn(`[env] Value for ${envKey} above maximum (${options.max}), using default:`, parsed)
    return defaultValue
  }

  return parsed
}

/**
 * Safely parses a comma-separated list from environment variable
 */
export function getListFromEnv(envKey: string, value: string | undefined, defaultValue: string[] = []): string[] {
  if (!value || value.trim() === '') {
    return defaultValue ?? []
  }

  try {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  } catch (error) {
    console.warn(`[env] Failed to parse list from ${envKey}, using default:`, error)
    return defaultValue
  }
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return getNodeEnv() === 'development'
}

/**
 * Checks if we're in production mode
 */
export function isProduction(): boolean {
  return getNodeEnv() === 'production'
}

/**
 * Checks if we're in test mode
 */
export function isTest(): boolean {
  return getNodeEnv() === 'test'
}
