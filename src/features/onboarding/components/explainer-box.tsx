import { motion } from 'framer-motion'
import type { ExplainerType } from '../onboarding-chat-types'

interface ExplainerBoxProps {
  type: ExplainerType
}

const EXPLAINER_CONFIG = {
  grow: {
    icon: '🌱',
    title: 'Grow',
    description: "I'll find new ways to reach more of the right people and ",
    boldText: 'scale your business',
    suffix: ' faster.',
    bg: 'bg-green-50',
    border: 'border-green-200',
    titleColor: 'text-green-700'
  },
  optimise: {
    icon: '⚡',
    title: 'Optimise',
    description: "Spot what's working in your marketing so you can fine-tune and get ",
    boldText: 'better results',
    suffix: ' with less effort.',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    titleColor: 'text-yellow-700'
  },
  protect: {
    icon: '🛡️',
    title: 'Protect',
    description: "I'll keep an eye on performance drops, wasted spend, and risky campaigns — ",
    boldText: 'protecting your brand',
    suffix: ' and budget before problems grow.',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-700'
  }
}

export const ExplainerBox = ({ type }: ExplainerBoxProps) => {
  const config = EXPLAINER_CONFIG[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${config.bg} ${config.border} border rounded-2xl p-4 max-w-[90%]`}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{config.icon}</span>
        <div>
          <h3 className={`font-semibold ${config.titleColor}`}>{config.title}</h3>
          <p className="text-gray-600 text-sm mt-1">
            {config.description}
            <span className="font-semibold italic">{config.boldText}</span>
            {config.suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
