interface QuickAction {
  id: string
  label: string
  description: string
}

interface QuickActionsProps {
  onAction: (actionId: string) => void
  disabled?: boolean
}

const actions: QuickAction[] = [
  {
    id: 'grow',
    label: 'Grow',
    description: 'Get growth insights'
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Optimization suggestions'
  },
  {
    id: 'protect',
    label: 'Protect',
    description: 'Risk analysis'
  }
]

export const QuickActions = ({ onAction, disabled = false }: QuickActionsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
          }`}
          title={action.description}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default QuickActions
