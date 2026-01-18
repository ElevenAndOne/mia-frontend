import { ReactNode, forwardRef } from 'react'
import { cn } from '@/utils/utils'

// Base item interface - extend this for specific use cases
export interface SelectableItem {
  id: string | number
  label: string
  description?: string
  badge?: string
}

// Selection mode
type SelectionMode = 'single' | 'multiple'

export interface SelectableListProps<T extends SelectableItem> {
  items: T[]
  selectedIds: (string | number)[]
  onSelectionChange: (ids: (string | number)[]) => void
  mode?: SelectionMode
  renderItem?: (item: T, isSelected: boolean) => ReactNode
  renderBadge?: (item: T) => ReactNode
  renderAction?: (item: T) => ReactNode
  accentColor?: 'blue' | 'orange' | 'green' | 'black'
  maxHeight?: string
  emptyMessage?: string
  className?: string
}

const accentStyles = {
  blue: {
    selected: 'border-blue-500 bg-blue-50',
    checkbox: 'border-blue-600 bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  orange: {
    selected: 'border-orange-500 bg-orange-50',
    checkbox: 'border-orange-600 bg-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  green: {
    selected: 'border-green-500 bg-green-50',
    checkbox: 'border-green-600 bg-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  black: {
    selected: 'border-black bg-gray-50',
    checkbox: 'border-black bg-black',
    badge: 'bg-gray-100 text-gray-800',
  },
}

function SelectableListInner<T extends SelectableItem>(
  {
    items,
    selectedIds,
    onSelectionChange,
    mode = 'single',
    renderItem,
    renderBadge,
    renderAction,
    accentColor = 'blue',
    maxHeight = '16rem',
    emptyMessage = 'No items available',
    className,
  }: SelectableListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const styles = accentStyles[accentColor]

  const handleItemClick = (itemId: string | number) => {
    if (mode === 'single') {
      // Toggle off if clicking the same item, otherwise select new item
      if (selectedIds.includes(itemId)) {
        onSelectionChange([])
      } else {
        onSelectionChange([itemId])
      }
    } else {
      // Multiple selection mode
      if (selectedIds.includes(itemId)) {
        onSelectionChange(selectedIds.filter((id) => id !== itemId))
      } else {
        onSelectionChange([...selectedIds, itemId])
      }
    }
  }

  if (items.length === 0) {
    return (
      <div
        ref={ref}
        className={cn('py-8 text-center text-gray-500 text-sm', className)}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn('space-y-2 overflow-y-auto', className)}
      style={{ maxHeight }}
    >
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id)

        return (
          <div
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              'relative p-4 rounded-lg border-2 transition-all cursor-pointer',
              isSelected ? styles.selected : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox indicator */}
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                  isSelected ? styles.checkbox : 'border-gray-300 bg-white'
                )}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              {renderItem ? (
                renderItem(item, isSelected)
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{item.label}</p>
                    {item.badge && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles.badge)}>
                        {item.badge}
                      </span>
                    )}
                    {renderBadge?.(item)}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  )}
                </div>
              )}

              {/* Optional action button */}
              {renderAction?.(item)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Export with forwardRef while maintaining generic type
export const SelectableList = forwardRef(SelectableListInner) as <T extends SelectableItem>(
  props: SelectableListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof SelectableListInner>
