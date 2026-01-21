/**
 * Micro Celebration - Haptic feedback and subtle visual celebration
 *
 * Features:
 * - Haptic vibration on mobile devices
 * - Subtle pulse animation
 * - Can be extended with confetti later
 */

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MicroCelebrationProps {
  show: boolean
  onComplete?: () => void
  type?: 'success' | 'milestone' | 'complete'
}

const MicroCelebration: React.FC<MicroCelebrationProps> = ({
  show,
  onComplete,
  type = 'success'
}) => {
  useEffect(() => {
    if (show) {
      // Trigger haptic feedback on supported devices
      triggerHaptic(type)

      // Auto-dismiss after animation
      const timer = setTimeout(() => {
        onComplete?.()
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [show, type, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
        >
          {/* Pulse ring animation */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`absolute w-24 h-24 rounded-full ${
              type === 'complete'
                ? 'bg-green-400/30'
                : type === 'milestone'
                ? 'bg-blue-400/30'
                : 'bg-purple-400/30'
            }`}
          />

          {/* Center dot */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className={`w-4 h-4 rounded-full ${
              type === 'complete'
                ? 'bg-green-500'
                : type === 'milestone'
                ? 'bg-blue-500'
                : 'bg-purple-500'
            }`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Trigger haptic feedback based on celebration type
 */
function triggerHaptic(type: 'success' | 'milestone' | 'complete') {
  if (!('vibrate' in navigator)) return

  try {
    switch (type) {
      case 'complete':
        // Longer celebration pattern
        navigator.vibrate([50, 30, 50, 30, 100])
        break
      case 'milestone':
        // Double tap
        navigator.vibrate([50, 30, 50])
        break
      case 'success':
      default:
        // Single short pulse
        navigator.vibrate([50])
        break
    }
  } catch {
    // Haptic not supported or blocked
    console.log('[HAPTIC] Vibration not available')
  }
}

export default MicroCelebration
