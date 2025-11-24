import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app'
import { SessionProvider } from './contexts/session-context'
import { DateRangeProvider } from './contexts/date-range-context'
import { UIStateProvider } from './contexts/ui-state-context'
import { AnalyticsProvider } from './contexts/analytics-context'
import { IntegrationsProvider } from './contexts/integrations-context'
import './index.css'

// iPhone 16 Pro viewport optimization
const viewport = document.querySelector('meta[name="viewport"]')
if (viewport) {
  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <DateRangeProvider>
          <UIStateProvider>
            <AnalyticsProvider>
              <IntegrationsProvider>
                <App />
              </IntegrationsProvider>
            </AnalyticsProvider>
          </UIStateProvider>
        </DateRangeProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
