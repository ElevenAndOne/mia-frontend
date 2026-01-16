import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from './contexts/session-context-shim'
import { OnboardingProvider } from './contexts/onboarding-context'
import { ModalProvider } from './contexts/modal-context'
import App from './App'
import './index.css'

// iPhone 16 Pro viewport optimization
const viewport = document.querySelector('meta[name="viewport"]')
if (viewport) {
  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no')
}

// Create React Query client with smart defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <OnboardingProvider>
          <ModalProvider>
            <App />
          </ModalProvider>
        </OnboardingProvider>
      </SessionProvider>
    </QueryClientProvider>
  </BrowserRouter>,
)