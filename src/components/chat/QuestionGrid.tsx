import React from 'react'
import { motion } from 'framer-motion'
import { useChat } from '../../contexts/ChatContext'
import { Button } from '../ui/Button'
import { clsx } from 'clsx'

export interface PresetQuestion {
  id: number
  text: string
  category: string
}

export interface QuestionGridProps {
  questions: PresetQuestion[]
  category: string
  onQuestionSelect: (question: PresetQuestion, index: number) => void
  disabled?: boolean
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export const QuestionGrid: React.FC<QuestionGridProps> = ({
  questions,
  category,
  onQuestionSelect,
  disabled = false,
  className,
  columns = 2
}) => {
  const { getSession, isAnalyzing } = useChat()
  const session = getSession(category)
  const askedQuestions = session?.askedQuestions || []

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  const handleQuestionClick = (question: PresetQuestion, index: number) => {
    if (disabled || isAnalyzing || askedQuestions.includes(index)) return
    onQuestionSelect(question, index)
  }

  return (
    <div className={clsx('grid gap-4', gridCols[columns], className)}>
      {questions.map((question, index) => {
        const isAsked = askedQuestions.includes(index)
        const isDisabled = disabled || isAnalyzing || isAsked

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!isDisabled ? { y: -2 } : undefined}
            whileTap={!isDisabled ? { scale: 0.98 } : undefined}
          >
            <Button
              onClick={() => handleQuestionClick(question, index)}
              disabled={isDisabled}
              variant={isAsked ? 'secondary' : 'ghost'}
              className={clsx(
                'h-auto p-4 text-left justify-start whitespace-normal text-wrap',
                'border border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                'transition-all duration-200',
                isAsked && 'bg-gray-50 text-gray-500 border-gray-300',
                !isDisabled && !isAsked && 'hover:shadow-md'
              )}
              fullWidth
            >
              <div className="flex items-start gap-3 w-full">
                <div className={clsx(
                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
                  isAsked 
                    ? 'bg-gray-300 text-gray-600' 
                    : 'bg-blue-100 text-blue-600'
                )}>
                  {isAsked ? '✓' : index + 1}
                </div>
                <span className="text-sm leading-relaxed">
                  {question.text}
                </span>
              </div>
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}

// Preset questions by category
export const PRESET_QUESTIONS = {
  grow: [
    { id: 0, text: "Which visual styles or themes perform best?", category: 'grow' },
    { id: 1, text: "Which messaging angle appeals most to our audience?", category: 'grow' },
    { id: 2, text: "Which creative format is driving the most engagement?", category: 'grow' },
    { id: 3, text: "Which captions or headlines resonate best with my audience?", category: 'grow' }
  ],
  optimise: [
    { id: 0, text: "Which creative gives me the most clicks for the lowest spend?", category: 'optimise' },
    { id: 1, text: "Which advert delivered the highest click-through rate (CTR)?", category: 'optimise' },
    { id: 2, text: "Which headlines or CTAs perform best?", category: 'optimise' },
    { id: 3, text: "How should I optimise creative to increase engagement?", category: 'optimise' }
  ],
  protect: [
    { id: 0, text: "Which ads are starting to lose engagement over time?", category: 'protect' },
    { id: 1, text: "Is creative fatigue affecting my ads?", category: 'protect' },
    { id: 2, text: "Which creative assets are showing declining performance trends?", category: 'protect' },
    { id: 3, text: "Are my audiences seeing the same creative too often?", category: 'protect' }
  ]
} as const

export type QuestionCategory = keyof typeof PRESET_QUESTIONS
