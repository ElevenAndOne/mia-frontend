import { apiFetch } from '../../../utils/api'

export const connectBrevoApiKey = async (apiKey: string) => {
  const response = await apiFetch('/api/oauth/brevo/save-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Failed to connect Brevo account')
  }

  return response.json()
}
