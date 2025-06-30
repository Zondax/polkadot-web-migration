import { describe, expect, it } from 'vitest'
import { cn } from '../styles'

describe('Styles Utilities', () => {
  describe('cn', () => {
    it('should combine simple class names', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle empty string', () => {
      const result = cn('')
      expect(result).toBe('')
    })

    it('should handle undefined and null values', () => {
      const result = cn('class1', undefined, 'class2', null, 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle boolean conditions', () => {
      const result = cn('class1', true && 'class2', false && 'class3', 'class4')
      expect(result).toBe('class1 class2 class4')
    })

    it('should handle object with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      })
      expect(result).toBe('class1 class3')
    })

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3', ['class4', 'class5'])
      expect(result).toBe('class1 class2 class3 class4 class5')
    })

    it('should handle mixed types', () => {
      const result = cn(
        'base-class',
        { 'conditional-class': true, 'hidden-class': false },
        ['array-class1', 'array-class2'],
        undefined,
        'final-class'
      )
      expect(result).toBe('base-class conditional-class array-class1 array-class2 final-class')
    })

    it('should merge Tailwind classes correctly', () => {
      // twMerge should handle conflicting Tailwind classes
      const result = cn('p-4', 'p-6') // padding conflict - should keep last one
      expect(result).toBe('p-6')
    })

    it('should merge complex Tailwind classes', () => {
      const result = cn('bg-red-500', 'bg-blue-600', 'text-white', 'text-black')
      expect(result).toBe('bg-blue-600 text-black')
    })

    it('should handle responsive Tailwind classes', () => {
      const result = cn('w-full', 'md:w-1/2', 'lg:w-1/3')
      expect(result).toBe('w-full md:w-1/2 lg:w-1/3')
    })

    it('should handle hover and focus states', () => {
      const result = cn('bg-blue-500', 'hover:bg-blue-600', 'focus:bg-blue-700')
      expect(result).toBe('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700')
    })

    it('should merge conflicting responsive classes', () => {
      const result = cn('w-full', 'w-1/2', 'md:w-1/3', 'md:w-1/4')
      expect(result).toBe('w-1/2 md:w-1/4')
    })

    it('should handle empty array', () => {
      const result = cn([])
      expect(result).toBe('')
    })

    it('should handle nested arrays', () => {
      const result = cn(['class1', ['class2', 'class3']], 'class4')
      expect(result).toBe('class1 class2 class3 class4')
    })

    it('should handle function return values', () => {
      const getClass = () => 'dynamic-class'
      const result = cn('static-class', getClass())
      expect(result).toBe('static-class dynamic-class')
    })

    it('should preserve all classes including duplicates (no automatic deduplication)', () => {
      const result = cn('class1', 'class2', 'class1', 'class3', 'class2')
      expect(result).toBe('class1 class2 class1 class3 class2')
    })

    it('should handle very long class names', () => {
      const longClass = 'very-long-class-name-that-might-be-used-in-complex-ui-components'
      const result = cn('short', longClass, 'another')
      expect(result).toBe(`short ${longClass} another`)
    })

    it('should handle special characters in class names', () => {
      const result = cn('class-with-dashes', 'class_with_underscores', 'class:with:colons')
      expect(result).toBe('class-with-dashes class_with_underscores class:with:colons')
    })

    it('should handle conditional logic with variables', () => {
      const isActive = true
      const isDisabled = false
      const variant = 'primary'
      
      const result = cn(
        'base-button',
        isActive && 'active',
        isDisabled && 'disabled',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary'
      )
      
      expect(result).toBe('base-button active btn-primary')
    })

    it('should handle complex Tailwind utility merging', () => {
      // Test margin conflicts
      const result1 = cn('m-4', 'm-6', 'mx-8', 'ml-2')
      expect(result1).toBe('m-6 mx-8 ml-2')
      
      // Test padding conflicts
      const result2 = cn('p-2', 'px-4', 'py-6', 'pt-8')
      expect(result2).toBe('p-2 px-4 py-6 pt-8')
    })

    it('should handle dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-gray-900', 'text-black', 'dark:text-white')
      expect(result).toBe('bg-white dark:bg-gray-900 text-black dark:text-white')
    })

    it('should work with component-style usage patterns', () => {
      // Simulating common component usage
      const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium'
      const variantStyles = 'bg-primary text-primary-foreground hover:bg-primary/90'
      const sizeStyles = 'h-10 px-4 py-2'
      const customStyles = 'custom-button-class'
      
      const result = cn(baseStyles, variantStyles, sizeStyles, customStyles)
      
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('bg-primary')
      expect(result).toContain('h-10')
      expect(result).toContain('custom-button-class')
    })

    it('should handle no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle single argument', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })
  })
})