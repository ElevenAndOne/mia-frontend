import { BaseService, SessionOptions } from './baseService'
import type {
  ChatRequest,
  ChatResponse,
  CreativeAnalysisRequest,
  CreativeAnalysisResponse,
  InsightContext,
  InsightQuestionRequest,
  InsightQuestionResponse,
  QuickInsightsRequest,
  QuickInsightsResponse
} from '../types'

export class InsightsService extends BaseService {
  sendChatMessage(payload: ChatRequest, options?: SessionOptions): Promise<ChatResponse> {
    return this.client.post<ChatResponse>('/api/chat', payload, {
      sessionId: options?.sessionId
    })
  }

  getGrowthData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse> {
    return this.submitInsightQuestion('growth', payload, options)
  }

  getImproveData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse> {
    return this.submitInsightQuestion('improve', payload, options)
  }

  getFixData(payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse> {
    return this.submitInsightQuestion('fix', payload, options)
  }

  getQuickInsights(type: 'grow' | 'optimize' | 'protect' | 'summary', payload: QuickInsightsRequest, options?: SessionOptions): Promise<QuickInsightsResponse> {
    return this.client.post<QuickInsightsResponse>(`/api/quick-insights/${type}`, payload, {
      sessionId: options?.sessionId
    })
  }

  getCreativeAnalysis(payload: CreativeAnalysisRequest, options?: SessionOptions): Promise<CreativeAnalysisResponse> {
    return this.client.post<CreativeAnalysisResponse>('/api/creative-analysis', payload, {
      sessionId: options?.sessionId
    })
  }

  private submitInsightQuestion(context: InsightContext, payload: Omit<InsightQuestionRequest, 'context'>, options?: SessionOptions): Promise<InsightQuestionResponse> {
    const endpointMap: Record<InsightContext, string> = {
      growth: '/api/growth-data',
      improve: '/api/improve-data',
      fix: '/api/fix-data'
    }

    return this.client.post<InsightQuestionResponse>(endpointMap[context], { ...payload, context }, {
      sessionId: options?.sessionId
    })
  }
}
