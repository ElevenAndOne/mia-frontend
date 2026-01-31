import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEscapeKey, useClickOutside } from '../../overlay'
import type { Platform } from '../types'

interface PlatformSelectorProps {
  isOpen: boolean
  onClose: () => void
  platforms: Platform[]
  selectedPlatforms: string[]
  onToggle: (platformId: string) => void
}

export const PlatformSelector = ({ isOpen, onClose, platforms, selectedPlatforms, onToggle }: PlatformSelectorProps) => {
  const popupRef = useRef<HTMLDivElement>(null)

  // Use overlay hooks for consistent behavior
  useEscapeKey(onClose, isOpen)
  useClickOutside([popupRef], onClose, isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[240px]"
        >
          <div className="flex flex-col p-1 gap-0.5">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id)
              const isDisabled = !platform.connected

              return <PlatformItem key={platform.id} platform={platform} isSelected={isSelected} isDisabled={isDisabled} onToggle={onToggle} />
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type PlatformItem = {
  isSelected: boolean;
  isDisabled: boolean;
  platform: Platform;
  onToggle: (id: string) => void;
}

function PlatformItem({ platform, isSelected, isDisabled, onToggle }: PlatformItem) {
  return (
    <button
      onClick={() => !isDisabled && onToggle(platform.id)}
      disabled={isDisabled}
      className={`w-full flex items-center justify-between px-2 py-2 transition-colors rounded-lg ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center shrink-0 rounded-md overflow-clip">
          {platform.icon}
        </div>
        <span className={`w-full font-medium text-left text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
          {platform.name}
        </span>
      </div>

      {/* Toggle switch */}
      <Toggle isSelected={isSelected} isDisabled={isDisabled} />
    </button>
  )
}

type ToggleProps = {
  isSelected: boolean
  isDisabled: boolean
}

function Toggle({ isSelected, isDisabled }: ToggleProps) {
  return (
    <div className='w-8.5 h-6 p-1'>
      <div className={`rounded-full relative transition-colors w-full h-full ${isSelected && !isDisabled ? 'bg-gray-900' : 'bg-gray-200'}`} >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isSelected && !isDisabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
      </div>
    </div>
  )
}

export default PlatformSelector
