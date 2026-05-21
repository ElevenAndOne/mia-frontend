import { apiFetch } from '../../utils/api'
import type { WhatsAppAlertData, WorkspaceAlertSettings } from './types'

export const fetchAlertData = async (token: string): Promise<WhatsAppAlertData> => {
  const res = await apiFetch(`/api/whatsapp-alerts/${token}`)
  if (!res.ok) throw new Error('Alert not found')
  return res.json()
}

export const fetchLatestAlert = async (sessionId: string): Promise<WhatsAppAlertData | null> => {
  const res = await apiFetch('/api/whatsapp-alerts/my-latest', {
    headers: { 'X-Session-ID': sessionId },
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json()
}

export const fetchWorkspaceAlertSettings = async (
  sessionId: string,
  tenantId: string
): Promise<WorkspaceAlertSettings> => {
  const res = await apiFetch(`/api/whatsapp-alerts/workspace/${tenantId}/settings`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) throw new Error('Failed to load alert settings')
  return res.json()
}

export const updateWorkspaceAlertsEnabled = async (
  sessionId: string,
  tenantId: string,
  enabled: boolean
): Promise<void> => {
  const res = await apiFetch(`/api/whatsapp-alerts/workspace/${tenantId}/settings`, {
    method: 'PATCH',
    headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error('Failed to update workspace alert settings')
}

export const sendTestAlert = async (sessionId: string): Promise<{ sent_to: string }> => {
  const res = await apiFetch('/api/whatsapp-alerts/test-send', {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Failed to send test message')
  }
  return res.json()
}

export const updateMySubscription = async (
  sessionId: string,
  data: { whatsapp_number?: string; subscribed: boolean }
): Promise<void> => {
  const res = await apiFetch('/api/whatsapp-alerts/me/subscription', {
    method: 'PATCH',
    headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save subscription')
}