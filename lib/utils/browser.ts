// Utility to detect Safari browser
export function isSafari() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // Safari on iOS and macOS (exclude Chrome, Edge, etc.)
  return (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua)) || /FxiOS/.test(ua)
}
