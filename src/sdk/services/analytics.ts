/**
 * Analytics and Insights Service
 */

import { APIClient } from '../client'
import { AnalyticsRequest, InsightsRequest, InsightsResponse, APIResponse } from '../types'

export class AnalyticsService {
  constructor(private client: APIClient) {}

  /**
   * Perform creative analysis
   */
  async analyzeCreative(request: Partial<AnalyticsRequest>): Promise<APIResponse<{ creative_response: string }>> {
    return this.client.post('/api/creative-analysis', {
      session_id: this.client.getSessionId(),
      ...request
    })
  }

  /**
   * Get growth data
   */
  async getGrowthData(request: Partial<AnalyticsRequest>): Promise<APIResponse<unknown>> {
    return this.client.post('/api/growth-data', {
      session_id: this.client.getSessionId(),
      ...request
    })
  }

  /**
   * Get improvement/optimization data
   */
  async getImproveData(request: Partial<AnalyticsRequest>): Promise<APIResponse<unknown>> {
    return this.client.post('/api/improve-data', {
      session_id: this.client.getSessionId(),
      ...request
    })
  }

  /**
   * Get fix/protection data
   */
  async getFixData(request: Partial<AnalyticsRequest>): Promise<APIResponse<unknown>> {
    return this.client.post('/api/fix-data', {
      session_id: this.client.getSessionId(),
      ...request
    })
  }

  /**
   * Get summary insights
   */
  async getSummaryInsights(request: InsightsRequest): Promise<APIResponse<InsightsResponse>> {
    return this.client.post('/api/quick-insights/summary', request)
  }

  /**
   * Get optimize insights
   */
  async getOptimizeInsights(request: InsightsRequest): Promise<APIResponse<InsightsResponse>> {
    return this.client.post('/api/quick-insights/optimize', request)
  }

  /**
   * Get protect insights
   */
  async getProtectInsights(request: InsightsRequest): Promise<APIResponse<InsightsResponse>> {
    return this.client.post('/api/quick-insights/protect', request)
  }
}
