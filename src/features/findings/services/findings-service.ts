import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type {
  AcknowledgeFindingResponse,
  FindingsListParams,
  FindingsResponse,
  RunFindingsResponse,
} from '../types'

const findingsPath = (tenantId: string, route = ''): string =>
  `/api/tenants/${tenantId}/findings${route}`

/** Carries the HTTP status so callers can word a 403 ("admins only") differently. */
export class FindingsRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FindingsRequestError'
    this.status = status
  }
}

// Throw (not null) so React Query surfaces a failed request as `error`; the hook
// then renders nothing and logs once. `available: false` is a normal 200 body.
const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new FindingsRequestError(`Findings request failed (${response.status})`, response.status)
  }
  return response.json() as Promise<T>
}

export const fetchFindings = async (
  sessionId: string,
  tenantId: string,
  params: FindingsListParams = {},
  signal?: AbortSignal
): Promise<FindingsResponse> => {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.campaign_id) search.set('campaign_id', params.campaign_id)
  if (params.kind?.length) search.set('kind', params.kind.join(','))
  if (params.min_severity) search.set('min_severity', params.min_severity)
  if (params.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  const response = await apiFetch(`${findingsPath(tenantId)}${query ? `?${query}` : ''}`, {
    headers: createSessionHeaders(sessionId),
    signal,
  })
  return readJson<FindingsResponse>(response)
}

export const acknowledgeFinding = async (
  sessionId: string,
  tenantId: string,
  findingId: number
): Promise<AcknowledgeFindingResponse> => {
  const response = await apiFetch(findingsPath(tenantId, `/${findingId}/acknowledge`), {
    method: 'POST',
    headers: createSessionHeaders(sessionId),
  })
  return readJson<AcknowledgeFindingResponse>(response)
}

/** Admin only — the backend answers 403 for everyone else. */
export const runFindings = async (
  sessionId: string,
  tenantId: string
): Promise<RunFindingsResponse> => {
  const response = await apiFetch(findingsPath(tenantId, '/run'), {
    method: 'POST',
    headers: createSessionHeaders(sessionId),
  })
  return readJson<RunFindingsResponse>(response)
}
