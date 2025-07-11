import { screen } from '@testing-library/react'
import { expect } from 'vitest'

/**
 * Utility functions for common test assertions
 */

/**
 * Safely get an element by test ID with error handling
 * @param testId The test ID to look for
 * @returns The found element
 */
export const getByTestIdSafe = (testId: string): HTMLElement => {
  try {
    return screen.getByTestId(testId)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to find element with test ID '${testId}': ${errorMessage}`)
  }
}

/**
 * Safely get an element by text with error handling
 * @param text The text to look for
 * @returns The found element
 */
export const getByTextSafe = (text: string): HTMLElement => {
  try {
    return screen.getByText(text)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to find element with text '${text}': ${errorMessage}`)
  }
}

/**
 * Verify that an element has a specific class
 * @param element The element to check
 * @param className The class name to verify
 */
export const verifyHasClass = (element: HTMLElement, className: string): void => {
  try {
    expect(element).toHaveClass(className)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Element does not have class '${className}': ${errorMessage}`)
  }
}

/**
 * Verify that an element does not have a specific class
 * @param element The element to check
 * @param className The class name to verify absence of
 */
export const verifyNotHasClass = (element: HTMLElement, className: string): void => {
  try {
    expect(element).not.toHaveClass(className)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Element unexpectedly has class '${className}': ${errorMessage}`)
  }
}

/**
 * Verify that an element has a specific attribute with a specific value
 * @param element The element to check
 * @param attributeName The attribute name
 * @param attributeValue The expected attribute value
 */
export const verifyAttribute = (element: HTMLElement, attributeName: string, attributeValue: string): void => {
  try {
    expect(element).toHaveAttribute(attributeName, attributeValue)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Element does not have attribute '${attributeName}' with value '${attributeValue}': ${errorMessage}`)
  }
}

/**
 * Verify that an element is in the document
 * @param element The element to check
 */
export const verifyInDocument = (element: HTMLElement): void => {
  try {
    expect(element).toBeInTheDocument()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Element is not in the document: ${errorMessage}`)
  }
}
