/**
 * MSW browser worker for MOCK_MODE. Started from main.tsx only when MOCK_MODE
 * is true (dynamic import keeps it out of the normal bundle).
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
