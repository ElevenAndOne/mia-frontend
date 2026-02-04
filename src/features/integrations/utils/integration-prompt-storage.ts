import { getCookie, setCookie } from '../../../utils/cookies'

const INTEGRATION_PROMPT_COOKIE = 'mia_integration_prompt_dismissed'

export const isIntegrationPromptDismissed = (): boolean => {
  return getCookie(INTEGRATION_PROMPT_COOKIE) === '1'
}

export const dismissIntegrationPrompt = (days: number = 30): void => {
  setCookie(INTEGRATION_PROMPT_COOKIE, '1', { days })
}
