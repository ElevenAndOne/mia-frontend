/**
 * Staff on WhatsApp (Oct 2026): the owner adds a staff member by name and number; Mia asks
 * that phone to join; a YES makes them a viewer with no login. Backend: routes/whatsapp_staff.py,
 * /api/tenants/{tenantId}/staff.
 *
 * A 403 means the feature is not on for this workspace (or WhatsApp is not live for it yet);
 * it is a state to render, not an error to shout about.
 */
import { apiFetch } from '../../../utils/api'

export interface StaffMember {
  user_id: string
  name: string
  whatsapp_number: string | null
  role: 'viewer' | 'admin' | string
  status: 'invited' | 'joined'
  invited_at: string | null
  joined_at: string | null
}

export interface StaffSettings {
  staff_posts_enabled: boolean
  staff_daily_photo_cap: number
  staff_daily_picture_cap: number
}

export interface StaffState extends StaffSettings {
  staff: StaffMember[]
  unavailable?: boolean
}

const headers = (sessionId: string) => ({ 'X-Session-ID': sessionId, 'Content-Type': 'application/json' })
const base = (tenantId: string) => `/api/tenants/${tenantId}/staff`

const detailOf = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json()
    return (typeof body?.detail === 'string' ? body.detail : body?.detail?.message) || fallback
  } catch {
    return fallback
  }
}

export const fetchStaff = async (sessionId: string, tenantId: string): Promise<StaffState> => {
  const response = await apiFetch(base(tenantId), { headers: { 'X-Session-ID': sessionId } })
  if (response.status === 403) {
    return { staff: [], staff_posts_enabled: true, staff_daily_photo_cap: 10, staff_daily_picture_cap: 3, unavailable: true }
  }
  if (!response.ok) throw new Error(await detailOf(response, 'Could not load your staff'))
  return response.json()
}

export const addStaff = async (
  sessionId: string,
  tenantId: string,
  body: { name: string; whatsapp_number: string; role?: 'viewer' | 'admin'; drive_email?: string },
): Promise<{ ok: boolean; member: StaffMember | null; delivery: 'sent' | 'template' | 'undelivered' | 'already_joined'; message: string }> => {
  const response = await apiFetch(base(tenantId), { method: 'POST', headers: headers(sessionId), body: JSON.stringify(body) })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not add them'))
  return response.json()
}

export const resendStaffAsk = async (
  sessionId: string,
  tenantId: string,
  userId: string,
): Promise<{ ok: boolean; delivery: string; message: string }> => {
  const response = await apiFetch(`${base(tenantId)}/${userId}/resend`, { method: 'POST', headers: headers(sessionId) })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not ask again'))
  return response.json()
}

export const removeStaff = async (sessionId: string, tenantId: string, userId: string): Promise<void> => {
  const response = await apiFetch(`${base(tenantId)}/${userId}`, { method: 'DELETE', headers: { 'X-Session-ID': sessionId } })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not remove them'))
}

export const saveStaffSettings = async (
  sessionId: string,
  tenantId: string,
  body: Partial<StaffSettings>,
): Promise<StaffSettings> => {
  const response = await apiFetch(`${base(tenantId)}/settings`, { method: 'PATCH', headers: headers(sessionId), body: JSON.stringify(body) })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not save'))
  return response.json()
}
