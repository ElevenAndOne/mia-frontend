/**
 * Creative Analysis Service
 * 
 * Handles creative analysis, insights generation, and related operations.
 */

import { APIClient } from '../client'
import { APIResponse } from '../types'

export interface CreativeAnalysisRequest {
  question: string
  context: string
  session_id: string
  user?: string
  selected_account?: any
  google_ads_id?: string
  ga4_property_id?: string
  start_date?: string
  end_date?: string
  image_urls?: string[]
  creative_ids?: string[]
}

export interface CreativeAnalysisResponse {
  success: boolean
  analysis?: string
  insights?: any[]
  recommendations?: any[]
  data?: any
  error?: string
}

export type InsightType = 'grow' | 'optimize' | 'protect'

export interface InsightAnalysisRequest {
  question: string
  context: InsightType
  user?: string
  session_id?: string
  selected_account?: any
  date_range?: string
  start_date?: string
  end_date?: string
}

export class CreativeService {
  constructor(private client: APIClient) {}

  // ============= Creative Analysis =============

  /**
   * Analyze creative performance and generate insights
   */
  async analyzeCreative(request: CreativeAnalysisRequest): Promise<APIResponse<CreativeAnalysisResponse>> {
    return this.client.post<CreativeAnalysisResponse>('/api/creative-analysis', request)
  }

  /**
   * Analyze creative with automatic session context
   */
  async analyzeCreativeWithSession(
    question: string,
    options: {
      imageUrls?: string[]
      creativeIds?: string[]
      startDate?: string
      endDate?: string
      context?: string
    } = {}
  ): Promise<APIResponse<CreativeAnalysisResponse>> {
    const sessionId = this.client.getSessionId()
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No active session found'
      }
    }

    return this.analyzeCreative({
      question,
      context: options.context || 'creative',
      session_id: sessionId,
      image_urls: options.imageUrls,
      creative_ids: options.creativeIds,
      start_date: options.startDate,
      end_date: options.endDate
    })
  }

  // ============= Insight Generation =============

  /**
   * Generate growth insights
   */
  async generateGrowthInsights(request: InsightAnalysisRequest): Promise<APIResponse<any>> {
    return this.client.post('/api/growth-data', {
      ...request,
      context: 'growth'
    })
  }

  /**
   * Generate optimization insights
   */
  async generateOptimizeInsights(request: InsightAnalysisRequest): Promise<APIResponse<any>> {
    return this.client.post('/api/improve-data', {
      ...request,
      context: 'optimize'
    })
  }

  /**
   * Generate protection insights
   */
  async generateProtectInsights(request: InsightAnalysisRequest): Promise<APIResponse<any>> {
    return this.client.post('/api/fix-data', {
      ...request,
      context: 'protect'
    })
  }

  /**
   * Generate insights based on type
   */
  async generateInsights(
    type: InsightType,
    question: string,
    options: {
      user?: string
      selectedAccount?: any
      dateRange?: string
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<APIResponse<any>> {
    const sessionId = this.client.getSessionId()
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No active session found'
      }
    }

    const request: InsightAnalysisRequest = {
      question,
      context: type,
      session_id: sessionId,
      user: options.user,
      selected_account: options.selectedAccount,
      date_range: options.dateRange,
      start_date: options.startDate,
      end_date: options.endDate
    }

    switch (type) {
      case 'grow':
        return this.generateGrowthInsights(request)
      case 'optimize':
        return this.generateOptimizeInsights(request)
      case 'protect':
        return this.generateProtectInsights(request)
      default:
        return {
          success: false,
          error: `Invalid insight type: ${type}`
        }
    }
  }

  // ============= Utility Methods =============

  /**
   * Upload creative images for analysis
   */
  async uploadCreativeImages(files: File[]): Promise<APIResponse<{ image_urls: string[] }>> {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`image_${index}`, file)
    })

    // Note: This would need a special handling in the client for FormData
    // For now, return a placeholder implementation
    return {
      success: false,
      error: 'Image upload not yet implemented in SDK'
    }
  }

  /**
   * Get creative analysis history
   */
  async getAnalysisHistory(limit: number = 10): Promise<APIResponse<CreativeAnalysisResponse[]>> {
    return this.client.get('/api/creative-analysis/history', {
      params: { limit: limit.toString() }
    })
  }

  /**
   * Save creative analysis result
   */
  async saveAnalysis(analysis: CreativeAnalysisResponse, title?: string): Promise<APIResponse<{ id: string }>> {
    return this.client.post('/api/creative-analysis/save', {
      analysis,
      title: title || 'Creative Analysis'
    })
  }
}
