export type ExplainerType = 'grow' | 'optimise' | 'protect'

export type MessageType =
  | 'mia'
  | 'user'
  | 'bronze-card'
  | 'explainer-box'
  | 'insight-card'
  | 'choice-buttons'

export type ChoiceVariant = 'primary' | 'secondary'

export interface ChoiceOption {
  label: string
  action: string
  variant?: ChoiceVariant
}

export interface InsightData {
  type: ExplainerType
  platform: string
  title: string
  metrics: { value: string; label: string; badge?: string }[]
  description: string
}

export type BronzeCardVariant = 'primary' | 'secondary'

export interface BronzeCardData {
  platform: string
  headline: string
  metricValue: number | string
  metricLabel: string
  secondaryMetric?: { value: string; label: string }
  variant?: BronzeCardVariant
}

export interface ChatMessage {
  id: string
  type: MessageType
  content?: string
  bronzeCard?: BronzeCardData
  explainerType?: ExplainerType
  insightData?: InsightData
  choices?: ChoiceOption[]
}

export type ChatMessageInput = Omit<ChatMessage, 'id'>
