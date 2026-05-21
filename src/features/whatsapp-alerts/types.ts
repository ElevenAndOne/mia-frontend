export interface WhatsAppAlertData {
  campaign_name: string
  phase_name: string
  red_kpi_names: string[]
  recommendation_1: string
  recommendation_2: string
  recommendation_3: string
}

export interface WorkspaceAlertMember {
  user_id: string
  role: string
  whatsapp_number: string | null
  whatsapp_alerts_subscribed: boolean
  is_current_user: boolean
}

export interface WorkspaceAlertSettings {
  whatsapp_alerts_enabled: boolean
  members: WorkspaceAlertMember[]
}