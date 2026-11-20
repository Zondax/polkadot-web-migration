import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}))

import { VercelAnalytics } from '../VercelAnalytics'

describe('VercelAnalytics', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders Vercel Web Analytics on Vercel', () => {
    vi.stubEnv('VERCEL', '1')
    const { queryByTestId } = render(<VercelAnalytics />)
    expect(queryByTestId('vercel-analytics')).not.toBeNull()
  })

  it('renders nothing elsewhere (Cloudflare Workers, Docker, local), where /_vercel/insights does not exist', () => {
    vi.stubEnv('VERCEL', '')
    const { container } = render(<VercelAnalytics />)
    expect(container.innerHTML).toBe('')
  })
})
