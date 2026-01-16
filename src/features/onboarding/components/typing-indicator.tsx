/**
 * TypingIndicator - Animated typing indicator for chat
 *
 * Shows three bouncing dots to indicate that Mia is "typing" a response.
 */

import React from 'react'
import { motion } from 'framer-motion'

export const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-1 px-4 py-3 bg-gray-100 rounded-2xl w-fit"
  >
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </motion.div>
)
