/**
 * ProgressDots - Progress indicator dots
 *
 * Displays a row of dots indicating progress through the onboarding flow.
 */

import React from 'react'

export interface ProgressDotsProps {
  current: number
  total: number
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({ current, total }) => (
  <div className="flex gap-1">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full transition-colors ${
          i < current ? 'bg-black' : 'bg-gray-300'
        }`}
      />
    ))}
  </div>
)
