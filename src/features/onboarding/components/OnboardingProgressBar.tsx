/**
 * Onboarding Progress Bar - Visual progress indicator
 *
 * Shows 4 steps with labels:
 * 1. Connecting
 * 2. First insight
 * 3. Second platform
 * 4. Complete
 */

import React from 'react'
import { motion } from 'framer-motion'

interface OnboardingProgressBarProps {
  step: number  // Current step (1-4)
  totalSteps?: number  // Total steps (default 4)
}

const STEP_LABELS = [
  'Connecting',
  'First insight',
  'Second platform',
  'Complete'
]

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  step,
  totalSteps = 4
}) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between">
        {/* Label */}
        <span className="text-sm text-gray-600 font-medium">
          {step <= totalSteps ? STEP_LABELS[step - 1] || 'Setting up' : 'Complete'}
        </span>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isCompleted = index < step
            const isCurrent = index === step - 1

            return (
              <motion.div
                key={index}
                initial={{ scale: 0.8 }}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted ? '#000' : '#E5E7EB',
                }}
                transition={{ duration: 0.3 }}
                className={`w-3 h-3 rounded-sm ${
                  isCompleted ? 'bg-black' : 'bg-gray-200'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Optional: Progress bar line */}
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-black rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default OnboardingProgressBar
