'use client'

import { MotionConfig } from 'framer-motion'
import type * as React from 'react'

/**
 * Applies the user's `prefers-reduced-motion` preference to all framer-motion
 * animations: transform/layout animations are disabled while opacity/colour
 * transitions are kept, so content still fades in (stays visible) and the
 * decorative background loops stop for users who opt out of motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
