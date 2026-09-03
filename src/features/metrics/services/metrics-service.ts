import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type {
  MetricsCatalogResponse,
  MetricsCompareRequest,
  MetricsCompareResponse,
  MetricsQueryRequest,
  MetricsQueryResponse,
  PerformanceParams,
  PerformanceResponse,
} from '../types'

const metricsPath = (tenantId: string, route: string): string =>
  `/api/tenants/${tenantId}/metrics/${route}`

// Throw (not null) so React Query surfaces a failed request as `error`; the hook
// then renders nothing and logs once. `available: false` is a normal 200 body.
const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw new Error(`Metrics request failed (${response.status})`)
  return response.json() as Promise<T>
}

export const fetchMetricsCatalog = async (
  sessionId: string,
  tenantId: string,
  signal?: AbortSignal
): Promise<MetricsCatalogResponse> => {
  const response = await apiFetch(metricsPath(tenantId, 'catalog'), {
    headers: createSessionHeaders(sessionId),
    signal,
  })
  return readJson<MetricsCatalogResponse>(response)
}

export const fetchPerformance = async (
  sessionId: string,
  tenantId: string,
  params: PerformanceParams,
  signal?: AbortSignal
): Promise<PerformanceResponse> => {
  const search = new URLSearchParams({ start_date: params.start_date, end_date: params.end_date })
  if (params.campaign_id) search.set('campaign_id', params.campaign_id)
  if (params.platforms?.length) search.set('platforms', params.platforms.join(','))
  const response = await apiFetch(`${metricsPath(tenantId, 'performance')}?${search.toString()}`, {
    headers: createSessionHeaders(sessionId),
    signal,
  })
  return readJson<PerformanceResponse>(response)
}

export const queryMetrics = async (
  sessionId: string,
  tenantId: string,
  body: MetricsQueryRequest,
  signal?: AbortSignal
): Promise<MetricsQueryResponse> => {
  const response = await apiFetch(metricsPath(tenantId, 'query'), {
    method: 'POST',
    headers: createSessionHeaders(sessionId, true),
    body: JSON.stringify(body),
    signal,
  })
  return readJson<MetricsQueryResponse>(response)
}

export const compareMetrics = async (
  sessionId: string,
  tenantId: string,
  body: MetricsCompareRequest,
  signal?: AbortSignal
): Promise<MetricsCompareResponse> => {
  const response = await apiFetch(metricsPath(tenantId, 'compare'), {
    method: 'POST',
    headers: createSessionHeaders(sessionId, true),
    body: JSON.stringify(body),
    signal,
  })
  return readJson<MetricsCompareResponse>(response)
}
