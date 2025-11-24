import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SessionProvider } from './contexts/SessionContext'
import { DateRangeProvider } from './contexts/DateRangeContext'
import { UIStateProvider } from './contexts/UIStateContext'
import { AnalyticsProvider } from './contexts/AnalyticsContext'
import { IntegrationsProvider } from './contexts/IntegrationsContext'
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
