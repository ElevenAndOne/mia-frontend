import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { clearIntegrationHighlight, getIntegrationHighlight } from '../utils/integration-highlight'

interface HighlightOptions {
  durationMs?: number
  scale?: number
  glowColor?: string
}

interface HighlightProps {
  className: string
  style?: CSSProperties
}

export const useIntegrationHighlight = (options: HighlightOptions = {}) => {
  const [highlightIds, setHighlightIds] = useState<string[]>([])

  useEffect(() => {
    const stored = getIntegrationHighlight()
    if (stored.length > 0) {
      setHighlightIds(stored)
      clearIntegrationHighlight()
    }
  }, [])

  const getHighlightProps = useCallback((integrationId: string): HighlightProps => {
    if (!highlightIds.includes(integrationId)) {
      return { className: '' }
    }

    return {
      className: 'integration-highlight',
      style: {
        '--integration-highlight-duration': `${options.durationMs ?? 1600}ms`,
        '--integration-highlight-scale': `${options.scale ?? 1.01}`,
        '--integration-highlight-glow': options.glowColor ?? 'rgba(59, 130, 246, 0.18)',
      } as CSSProperties,
    }
  }, [highlightIds, options.durationMs, options.glowColor, options.scale])

  return {
    highlightIds,
    getHighlightProps,
  }
}
