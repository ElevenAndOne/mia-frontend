export interface WhatsAppAlertData {
  alert_token?: string | null
  campaign_name: string
  phase_name: string
  red_kpi_names: string[]
  recommendation_1: string
  recommendation_2: string
  recommendation_3: string
  /** The alert's campaign, for "View Campaign" (19 Nov 2026); null for a test alert */
  campaign_id?: string | null
  /** 'v2' when the campaign was made in the Campaign builder */
  builder?: string | null
}

export interface WorkspaceAlertMember {
  user_id: string
  name: string | null
  email: string | null
  role: string
  whatsapp_number: string | null
  whatsapp_alerts_subscribed: boolean
  is_current_user: boolean
}

export interface WorkspaceAlertSettings {
  whatsapp_alerts_enabled: boolean
  members: WorkspaceAlertMember[]
}