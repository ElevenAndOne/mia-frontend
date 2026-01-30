import { motion, AnimatePresence } from 'framer-motion'

interface Platform {
  id: string
  name: string
  icon: string
  connected: boolean
}

interface PlatformSelectorProps {
  isOpen: boolean
  onClose: () => void
  platforms: Platform[]
  selectedPlatforms: string[]
  onToggle: (platformId: string) => void
}

export const PlatformSelector = ({
  isOpen,
  onClose,
  platforms,
  selectedPlatforms,
  onToggle
}: PlatformSelectorProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[240px]"
          >
            <div className="py-2">
              {platforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id)
                const isDisabled = !platform.connected

                return (
                  <button
                    key={platform.id}
                    onClick={() => !isDisabled && onToggle(platform.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={platform.icon}
                        alt={platform.name}
                        className="w-6 h-6"
                      />
                      <span className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                        {platform.name}
                      </span>
                    </div>

                    {/* Toggle switch */}
                    <div
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        isSelected && !isDisabled
                          ? 'bg-gray-900'
                          : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          isSelected && !isDisabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer hint */}
            {platforms.some(p => !p.connected) && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Connect more platforms in Integrations
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PlatformSelector
