export interface CampaignObjective {
  title: string
  intention: string | null
  outcome: string | null
}

export interface CampaignEvent {
  name: string
  date: string | null
  participation: string | null
  alignment: string | null
}

export interface CampaignGuideExtracted {
  campaign_name: string | null
  period: string | null
  tagline: string | null
  target_audience: string | null
  objectives: CampaignObjective[] | null
  channels: string[] | null
  content_formats: string[] | null
  key_messages: string[] | null
  key_events: CampaignEvent[] | null
  content_themes: string | null
  emotional_tone: string | null
  visual_references: string | null
  color_palette: string | null
  activation_mechanics: string | null
  strategic_insights: string | null
}

export interface CampaignGuide {
  id: string
  tenant_id: string
  filename: string
  extracted_data: CampaignGuideExtracted | null
  uploaded_at: string | null
  created_at: string | null
}

export interface CampaignUploadResult {
  success: boolean
  filename: string
  extracted: CampaignGuideExtracted
  raw_text: string
}
