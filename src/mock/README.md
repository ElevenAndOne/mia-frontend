# Mock Data System

This directory contains a comprehensive mock data system for development that simulates a full production environment.

## Features

- **Fake Authentication**: Mock Google OAuth and Meta Auth flows
- **Mock Database**: Realistic user profiles, accounts, and campaign data
- **Mock APIs**: Simulated responses for all external services
- **Configurable Behavior**: Control delays, failures, and data sets
- **Development Tools**: API logging and debugging utilities

## Setup

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Enable mock data** in your `.env`:
   ```env
   VITE_ENVIRONMENT=development
   VITE_USE_MOCK_DATA=true
   VITE_USE_MOCK_AUTH=true
   VITE_SHOW_API_LOGS=true
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

- `VITE_USE_MOCK_DATA`: Enable/disable mock data (true/false)
- `VITE_USE_MOCK_AUTH`: Enable/disable mock authentication (true/false)
- `VITE_SHOW_API_LOGS`: Show API request logs in console (true/false)
- `VITE_MOCK_DELAY_MS`: Simulate network delay in milliseconds (default: 500)
- `VITE_SIMULATE_FAILURES`: Enable random API failures (true/false)

### Mock Data Types

#### Users
- Realistic user profiles with names, emails, and avatars
- Google and Meta user IDs
- Configurable authentication states

#### Accounts  
- Business accounts with different types (E-commerce, SaaS, etc.)
- Google Ads and GA4 property connections
- Meta Ads account associations
- Color-coded account branding

#### Campaigns
- Google Ads and Meta Ads campaigns
- Realistic performance metrics (impressions, clicks, conversions)
- Multiple campaign statuses (enabled, paused, removed)
- Historical performance data

#### Insights
- Time-series performance data
- Demographic breakdowns (device, age, gender, location)
- Growth metrics and trends
- Custom date ranges

## Architecture

### Data Layer
- `data/`: Mock data generators and static datasets
- `config/`: Configuration and environment handling
- `services/`: Mock API services and HTTP interceptors

### Integration
- `mockFetch.ts`: Intercepts fetch requests automatically
- `SdkContext.tsx`: Injects mock fetch into SDK configuration
- Environment-based activation (no code changes needed)

## Usage Examples

### Testing Authentication Flow
```typescript
// Authentication automatically uses mock providers
const { login } = useAuth()
await login() // Returns mock user and session
```

### Account Selection
```typescript
// Accounts are automatically populated with mock data
const { accounts } = useAccounts()
console.log(accounts) // Array of mock business accounts
```

### Campaign Performance
```typescript
// Campaign data includes realistic metrics
const { campaigns } = useCampaigns(accountId)
console.log(campaigns) // Mock campaigns with performance data
```

### Custom Mock Data

You can extend the mock system by adding new data generators:

```typescript
// src/mock/data/customData.ts
export const generateCustomMockData = () => {
  return {
    id: Math.random().toString(36),
    customField: 'mock value',
    // ... more mock data
  }
}
```

## Development Tools

### API Logging
Set `VITE_SHOW_API_LOGS=true` to see all API requests in the browser console:
```
[MOCK] Mock Fetch: GET /api/accounts
[MOCK] Mock response returned in 500ms
```

### Simulated Failures
Set `VITE_SIMULATE_FAILURES=true` to randomly fail 5% of API requests:
```
[MOCK] Simulating API failure for testing
```

### Network Delay Simulation
Set `VITE_MOCK_DELAY_MS=1000` to simulate slower network conditions.

## Switching Between Mock and Production

The system automatically detects the environment and switches between mock and real APIs:

```typescript
// In development with mock enabled
const response = await sdk.auth.getStatus() // Returns mock data

// In production or with mock disabled  
const response = await sdk.auth.getStatus() // Makes real API call
```

## Troubleshooting

### Mock data not loading
1. Check `.env` file exists and has `VITE_USE_MOCK_DATA=true`
2. Restart development server after changing environment variables
3. Check browser console for mock logs

### Authentication issues
1. Ensure `VITE_USE_MOCK_AUTH=true`
2. Mock auth automatically approves all login attempts
3. Session data is stored in memory (clears on page refresh)

### Missing data
1. Mock data is generated randomly - refresh to see different data
2. Check mock data generators in `src/mock/data/`
3. Add custom data generators as needed
