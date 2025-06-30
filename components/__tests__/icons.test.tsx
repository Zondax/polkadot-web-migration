import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UsersIcon, SettingsIcon, SearchIcon, Spinner, Logo, VercelLogo } from '../icons'

describe('Icon Components', () => {
  describe('UsersIcon', () => {
    it('should render with default props', () => {
      render(<UsersIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-labelledby', 'users-icon-title')
    })

    it('should render with title', () => {
      render(<UsersIcon />)
      
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('should have correct default attributes', () => {
      render(<UsersIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveAttribute('width', '24')
      expect(icon).toHaveAttribute('height', '24')
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
      expect(icon).toHaveAttribute('fill', 'none')
      expect(icon).toHaveAttribute('stroke', 'currentColor')
      expect(icon).toHaveAttribute('stroke-width', '2')
      expect(icon).toHaveAttribute('stroke-linecap', 'round')
      expect(icon).toHaveAttribute('stroke-linejoin', 'round')
    })

    it('should accept custom props', () => {
      render(<UsersIcon className="custom-class" data-testid="custom-icon" />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveClass('custom-class')
      expect(icon).toHaveAttribute('data-testid', 'custom-icon')
    })

    it('should have proper SVG structure', () => {
      render(<UsersIcon />)
      
      const icon = screen.getByRole('img')
      const paths = icon.querySelectorAll('path')
      const circles = icon.querySelectorAll('circle')
      
      expect(paths).toHaveLength(3)
      expect(circles).toHaveLength(1)
    })
  })

  describe('SettingsIcon', () => {
    it('should render with default props', () => {
      render(<SettingsIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-labelledby', 'settings-icon-title')
    })

    it('should render with title', () => {
      render(<SettingsIcon />)
      
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should have correct default attributes', () => {
      render(<SettingsIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveAttribute('width', '24')
      expect(icon).toHaveAttribute('height', '24')
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
      expect(icon).toHaveAttribute('fill', 'none')
      expect(icon).toHaveAttribute('stroke', 'currentColor')
    })

    it('should accept custom props', () => {
      render(<SettingsIcon data-testid="settings-custom" className="settings-class" />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveAttribute('data-testid', 'settings-custom')
      expect(icon).toHaveClass('settings-class')
    })

    it('should have proper SVG structure', () => {
      render(<SettingsIcon />)
      
      const icon = screen.getByRole('img')
      const paths = icon.querySelectorAll('path')
      const circles = icon.querySelectorAll('circle')
      
      expect(paths).toHaveLength(1)
      expect(circles).toHaveLength(1)
    })
  })

  describe('SearchIcon', () => {
    it('should render with default props', () => {
      render(<SearchIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-labelledby', 'search-icon-title')
    })

    it('should render with title', () => {
      render(<SearchIcon />)
      
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should have correct default attributes', () => {
      render(<SearchIcon />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveAttribute('width', '24')
      expect(icon).toHaveAttribute('height', '24')
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
      expect(icon).toHaveAttribute('fill', 'none')
      expect(icon).toHaveAttribute('stroke', 'currentColor')
    })

    it('should accept custom props', () => {
      render(<SearchIcon data-testid="search-icon" />)
      
      const icon = screen.getByTestId('search-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should have proper SVG structure', () => {
      render(<SearchIcon />)
      
      const icon = screen.getByRole('img')
      const paths = icon.querySelectorAll('path')
      const circles = icon.querySelectorAll('circle')
      
      expect(paths).toHaveLength(1)
      expect(circles).toHaveLength(1)
    })
  })

  describe('Spinner', () => {
    it('should render with default props', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveAttribute('aria-labelledby', 'spinner-title')
    })

    it('should render with title', () => {
      render(<Spinner />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should have correct default attributes', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      expect(spinner).toHaveAttribute('viewBox', '0 0 24 24')
      expect(spinner).toHaveAttribute('fill', 'none')
    })

    it('should have animate-spin class by default', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      expect(spinner).toHaveClass('animate-spin')
      expect(spinner).toHaveClass('h-5')
      expect(spinner).toHaveClass('w-5')
      expect(spinner).toHaveClass('text-gray-700')
    })

    it('should accept custom className', () => {
      render(<Spinner className="custom-spinner-class" />)
      
      const spinner = screen.getByRole('img')
      expect(spinner).toHaveClass('custom-spinner-class')
      expect(spinner).toHaveClass('animate-spin') // Should still have default classes
    })

    it('should be wrapped in flex container', () => {
      const { container } = render(<Spinner />)
      
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
      expect(wrapper).toHaveClass('justify-center')
      expect(wrapper).toHaveClass('h-full')
    })

    it('should have proper SVG structure', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      const circles = spinner.querySelectorAll('circle')
      const paths = spinner.querySelectorAll('path')
      
      expect(circles).toHaveLength(1)
      expect(paths).toHaveLength(1)
    })

    it('should have correct circle attributes', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      const circle = spinner.querySelector('circle')
      
      expect(circle).toHaveAttribute('cx', '12')
      expect(circle).toHaveAttribute('cy', '12')
      expect(circle).toHaveAttribute('r', '10')
      expect(circle).toHaveClass('opacity-25')
    })

    it('should have correct path attributes', () => {
      render(<Spinner />)
      
      const spinner = screen.getByRole('img')
      const path = spinner.querySelector('path')
      
      expect(path).toHaveClass('opacity-75')
      expect(path).toHaveAttribute('fill', 'currentColor')
    })
  })

  describe('Logo', () => {
    it('should render with default props', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('aria-labelledby', 'logo-title')
    })

    it('should render with title', () => {
      render(<Logo />)
      
      expect(screen.getByText('Application Logo')).toBeInTheDocument()
    })

    it('should have correct default attributes', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      expect(logo).toHaveAttribute('width', '32')
      expect(logo).toHaveAttribute('height', '32')
      expect(logo).toHaveAttribute('viewBox', '0 0 32 32')
      expect(logo).toHaveAttribute('fill', 'none')
    })

    it('should have correct styling classes', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      expect(logo).toHaveClass('text-gray-100')
    })

    it('should have proper SVG structure', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      const rects = logo.querySelectorAll('rect')
      const paths = logo.querySelectorAll('path')
      
      expect(rects).toHaveLength(1)
      expect(paths).toHaveLength(1)
    })

    it('should have correct rect attributes', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      const rect = logo.querySelector('rect')
      
      expect(rect).toHaveAttribute('width', '100%')
      expect(rect).toHaveAttribute('height', '100%')
      expect(rect).toHaveAttribute('rx', '16')
      expect(rect).toHaveAttribute('fill', 'currentColor')
    })

    it('should have correct path attributes', () => {
      render(<Logo />)
      
      const logo = screen.getByRole('img')
      const path = logo.querySelector('path')
      
      expect(path).toHaveAttribute('fill-rule', 'evenodd')
      expect(path).toHaveAttribute('clip-rule', 'evenodd')
      expect(path).toHaveAttribute('fill', 'black')
    })
  })

  describe('VercelLogo', () => {
    it('should render with default props', () => {
      render(<VercelLogo />)
      
      const logo = screen.getByRole('img')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('aria-label', 'Vercel logomark')
    })

    it('should have correct default attributes', () => {
      render(<VercelLogo />)
      
      const logo = screen.getByRole('img')
      expect(logo).toHaveAttribute('height', '64')
      expect(logo).toHaveAttribute('viewBox', '0 0 74 64')
    })

    it('should accept custom props', () => {
      render(<VercelLogo width="100" className="vercel-custom" />)
      
      const logo = screen.getByRole('img')
      expect(logo).toHaveAttribute('width', '100')
      expect(logo).toHaveClass('vercel-custom')
    })

    it('should have proper SVG structure', () => {
      render(<VercelLogo />)
      
      const logo = screen.getByRole('img')
      const paths = logo.querySelectorAll('path')
      
      expect(paths).toHaveLength(1)
    })

    it('should have correct path attributes', () => {
      render(<VercelLogo />)
      
      const logo = screen.getByRole('img')
      const path = logo.querySelector('path')
      
      expect(path).toHaveAttribute('fill', 'currentColor')
      expect(path).toHaveAttribute('d', 'M37.5896 0.25L74.5396 64.25H0.639648L37.5896 0.25Z')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for all icons', () => {
      const { container: usersContainer } = render(<UsersIcon />)
      const { container: settingsContainer } = render(<SettingsIcon />)
      const { container: searchContainer } = render(<SearchIcon />)
      const { container: spinnerContainer } = render(<Spinner />)
      const { container: logoContainer } = render(<Logo />)
      const { container: vercelContainer } = render(<VercelLogo />)

      const usersIcon = usersContainer.querySelector('svg')
      const settingsIcon = settingsContainer.querySelector('svg')
      const searchIcon = searchContainer.querySelector('svg')
      const spinnerIcon = spinnerContainer.querySelector('svg')
      const logoIcon = logoContainer.querySelector('svg')
      const vercelIcon = vercelContainer.querySelector('svg')

      expect(usersIcon).toHaveAttribute('role', 'img')
      expect(settingsIcon).toHaveAttribute('role', 'img')
      expect(searchIcon).toHaveAttribute('role', 'img')
      expect(spinnerIcon).toHaveAttribute('role', 'img')
      expect(logoIcon).toHaveAttribute('role', 'img')
      expect(vercelIcon).toHaveAttribute('role', 'img')
    })

    it('should have descriptive titles for screen readers', () => {
      render(
        <>
          <UsersIcon />
          <SettingsIcon />
          <SearchIcon />
          <Spinner />
          <Logo />
        </>
      )

      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Application Logo')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<UsersIcon tabIndex={0} />)
      
      const icon = screen.getByRole('img')
      expect(icon).toHaveAttribute('tabindex', '0')
    })
  })

  describe('Customization', () => {
    it('should support custom styling for all icons', () => {
      const customClass = 'custom-icon-style'
      
      render(
        <>
          <UsersIcon className={customClass} />
          <SettingsIcon className={customClass} />
          <SearchIcon className={customClass} />
          <VercelLogo className={customClass} />
        </>
      )

      const icons = screen.getAllByRole('img')
      icons.slice(0, 4).forEach(icon => {
        expect(icon).toHaveClass(customClass)
      })
    })

    it('should support custom props forwarding', () => {
      render(
        <>
          <UsersIcon data-testid="users-custom" />
          <SettingsIcon data-testid="settings-custom" />
          <SearchIcon data-testid="search-custom" />
          <VercelLogo data-testid="vercel-custom" />
        </>
      )

      expect(screen.getByTestId('users-custom')).toBeInTheDocument()
      expect(screen.getByTestId('settings-custom')).toBeInTheDocument()
      expect(screen.getByTestId('search-custom')).toBeInTheDocument()
      expect(screen.getByTestId('vercel-custom')).toBeInTheDocument()
    })

    it('should accept additional HTML attributes', () => {
      render(
        <>
          <UsersIcon id="users-id" />
          <SettingsIcon id="settings-id" />
          <SearchIcon id="search-id" />
        </>
      )

      expect(screen.getByRole('img', { name: 'Users' })).toHaveAttribute('id', 'users-id')
      expect(screen.getByRole('img', { name: 'Settings' })).toHaveAttribute('id', 'settings-id')
      expect(screen.getByRole('img', { name: 'Search' })).toHaveAttribute('id', 'search-id')
    })
  })

  describe('Props forwarding', () => {
    it('should forward all valid SVG props', () => {
      render(
        <UsersIcon
          data-testid="forwarded-props-test"
          onClick={() => {}}
          onMouseOver={() => {}}
          style={{ color: 'red' }}
        />
      )

      const icon = screen.getByTestId('forwarded-props-test')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveStyle('color: rgb(255, 0, 0)')
    })

    it('should handle event handlers correctly', () => {
      const handleClick = vi.fn()
      const handleMouseOver = vi.fn()

      render(
        <SettingsIcon
          data-testid="event-test"
          onClick={handleClick}
          onMouseOver={handleMouseOver}
        />
      )

      const icon = screen.getByTestId('event-test')
      
      fireEvent.click(icon)
      expect(handleClick).toHaveBeenCalled()

      fireEvent.mouseOver(icon)
      expect(handleMouseOver).toHaveBeenCalled()
    })
  })
})