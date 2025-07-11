import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type TabItem, Tabs } from '../Tabs'

describe('Tabs Component', () => {
  const mockTabs: TabItem[] = [
    { label: 'Tab 1', value: 'tab1', component: () => <div>Content 1</div> },
    { label: 'Tab 2', value: 'tab2', component: () => <div>Content 2</div> },
    { label: 'Tab 3', value: 'tab3', component: () => <div>Content 3</div> },
  ]

  it('renders all tab labels', () => {
    render(<Tabs activeTab={0} tabs={mockTabs} onTabChange={() => {}} />)

    expect(screen.getByText('Tab 1')).toBeDefined()
    expect(screen.getByText('Tab 2')).toBeDefined()
    expect(screen.getByText('Tab 3')).toBeDefined()
  })

  it('renders the first tab content by default', () => {
    render(<Tabs activeTab={0} tabs={mockTabs} onTabChange={() => {}} />)

    // Check if first tab is selected/active
    const activeTab = screen.getByText('Tab 1').closest('[data-state="active"]')
    expect(activeTab).not.toBeNull()
  })

  it('calls handler with correct index when clicking different tabs', () => {
    const handleTabChange = vi.fn()
    render(<Tabs activeTab={0} tabs={mockTabs} onTabChange={handleTabChange} />)

    // Find the second tab button
    const secondTab = screen.getByText('Tab 2')

    // Click the second tab
    fireEvent.click(secondTab)

    // Verify that the handler was called with the correct index
    expect(handleTabChange).toHaveBeenCalledWith(1)
  })

  it('highlights the active tab', () => {
    render(<Tabs activeTab={0} tabs={mockTabs} onTabChange={() => {}} />)

    // Find the active tab using data-state attribute
    const activeTab = screen.getByText('Tab 1').closest('[data-state="active"]')
    expect(activeTab).not.toBeNull()

    // Verify inactive tabs
    const inactiveTab = screen.getByText('Tab 3').closest('[data-state="inactive"]')
    expect(inactiveTab).not.toBeNull()
  })

  it('calls onChange handler when tab changes', () => {
    const handleChange = vi.fn()
    render(<Tabs activeTab={0} tabs={mockTabs} onTabChange={handleChange} />)

    // Click the second tab
    fireEvent.click(screen.getByText('Tab 2'))

    // Check if handler was called with correct index
    expect(handleChange).toHaveBeenCalledWith(1)
  })

  it('respects activeTab prop', () => {
    render(<Tabs activeTab={2} tabs={mockTabs} onTabChange={() => {}} />)

    // Check if the third tab is selected/active
    const activeTab = screen.getByText('Tab 3').closest('[data-state="active"]')
    expect(activeTab).not.toBeNull()

    // Verify other tabs are not active
    const inactiveTab1 = screen.getByText('Tab 1').closest('[data-state="inactive"]')
    const inactiveTab2 = screen.getByText('Tab 2').closest('[data-state="inactive"]')
    expect(inactiveTab1).not.toBeNull()
    expect(inactiveTab2).not.toBeNull()
  })
})
