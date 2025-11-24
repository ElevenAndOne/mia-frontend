import React from 'react'
import { Card, CardContent } from './Card'

interface InsightCardProps {
  value: string
  label: string
  trend?: string
  unit?: string
  icon?: React.ReactNode
  className?: string
}

export const InsightCard: React.FC<InsightCardProps> = ({
  value,
  label,
  trend,
  unit,
  icon,
  className = ''
}) => {
  const getTrendColor = (trendValue?: string) => {
    if (!trendValue) return ''
    const isPositive = trendValue.startsWith('+') || parseFloat(trendValue) > 0
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  const getTrendIcon = (trendValue?: string) => {
    if (!trendValue) return null
    const isPositive = trendValue.startsWith('+') || parseFloat(trendValue) > 0
    
    return isPositive ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <Card className={`${className}`} padding="md" shadow="sm" rounded="xl">
      <CardContent>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
            <p className="text-sm text-gray-600 mt-1">{label}</p>
          </div>
          {icon && (
            <div className="ml-3 flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface InsightListProps {
  insights: string[]
  className?: string
}

export const InsightList: React.FC<InsightListProps> = ({ insights, className = '' }) => {
  return (
    <Card className={className} padding="md" shadow="sm" rounded="xl">
      <CardContent>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Insights</h4>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
              <span className="text-sm text-gray-700">{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
