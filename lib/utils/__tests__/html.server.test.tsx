// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { muifyHtml } from '../html'

describe('muifyHtml on the server', () => {
  // Without a DOM, DOMPurify cannot sanitize (it returns its input), so SSR on
  // Node or Cloudflare Workers must never render the external HTML.
  it('renders nothing instead of unsanitized HTML', () => {
    expect(typeof window).toBe('undefined')
    expect(muifyHtml('<img src=x onerror="alert(1)"><p>icon</p>')).toBeNull()
  })
})
