import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExplorerItemType } from '@/config/explorers'
import { ExplorerLink } from '../ExplorerLink'

describe('ExplorerLink Component', () => {
  it('renders correctly with an address', () => {
    render(<ExplorerLink value="f1234567890abcdef" />)

    // Check if the link is in the document
    const addressElement = screen.getByText(/f1.*def/)
    expect(addressElement).toBeDefined()
  })

  it('renders with correct href attribute when explorer config is provided', () => {
    render(<ExplorerLink value="f1234567890abcdef" appId="polkadot" explorerLinkType={ExplorerItemType.Address} />)

    // Check if the link points to the correct URL
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('polkadot')
    expect(link.getAttribute('href')).toContain('f1234567890abcdef')
  })

  it('applies custom className when provided', () => {
    render(<ExplorerLink value="f1234567890abcdef" appId="polkadot" explorerLinkType={ExplorerItemType.Address} className="custom-class" />)

    const link = screen.getByRole('link')
    expect(link.className).toContain('custom-class')
  })

  it('displays a shortened version of the address', () => {
    render(<ExplorerLink value="f1234567890abcdef" />)

    // Check for truncated version of the address
    const displayedText = screen.getByText(/f1.*def/).textContent
    expect(displayedText?.replace('...', '').length).toBeLessThan('f1234567890abcdef'.length)
    expect(displayedText).toContain('...')
  })

  it('has a copy button by default', () => {
    render(<ExplorerLink value="f1234567890abcdef" />)

    const copyButton = screen.getByRole('button')
    expect(copyButton).toBeDefined()
  })

  it('does not render copy button when hasCopyButton is false', () => {
    render(<ExplorerLink value="f1234567890abcdef" hasCopyButton={false} />)

    const copyButtons = screen.queryAllByRole('button')
    expect(copyButtons.length).toBe(0)
  })

  it('disables link functionality when disableLink is true', () => {
    render(<ExplorerLink value="f1234567890abcdef" appId="polkadot" explorerLinkType={ExplorerItemType.Address} disableLink={true} />)

    const links = screen.queryAllByRole('link')
    expect(links.length).toBe(0) // No links should be rendered

    // Address should still be displayed as text
    const addressElement = screen.getByText(/f1.*def/)
    expect(addressElement).toBeDefined()
  })

  it('renders children instead of value when provided', () => {
    render(
      <ExplorerLink value="f1234567890abcdef" appId="polkadot" explorerLinkType={ExplorerItemType.Address}>
        Custom Text
      </ExplorerLink>
    )

    const customText = screen.getByText('Custom Text')
    expect(customText).toBeDefined()

    // Original value should not be visible
    const originalValue = screen.queryByText(/f1.*def/)
    expect(originalValue).toBeNull()
  })
})
