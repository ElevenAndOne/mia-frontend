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
    bg: 'bg-success-primary',
    border: 'border-utility-success-300',
    titleColor: 'text-success'
  },
  optimize: {
    icon: '⚡',
    title: 'Optimise',
    description: "Spot what's working in your marketing so you can fine-tune and get ",
    boldText: 'better results',
    suffix: ' with less effort.',
    bg: 'bg-warning-primary',
    border: 'border-utility-warning-300',
    titleColor: 'text-warning'
  },
  protect: {
    icon: '🛡️',
    title: 'Protect',
    description: "I'll keep an eye on performance drops, wasted spend, and risky campaigns — ",
    boldText: 'protecting your brand',
    suffix: ' and budget before problems grow.',
    bg: 'bg-utility-info-100',
    border: 'border-utility-info-300',
    titleColor: 'text-utility-info-700'
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
        <span className="title-h6">{config.icon}</span>
        <div>
          <h3 className={`label-md ${config.titleColor}`}>{config.title}</h3>
          <p className="paragraph-sm text-tertiary mt-1">
            {config.description}
            <span className="font-semibold italic">{config.boldText}</span>
            {config.suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
