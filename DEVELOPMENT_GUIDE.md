# Development Environment Setup Guide

This guide explains how to set up and use the fake data system for development.

## Quick Start

1. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

2. **Edit your `.env` file** to enable mock data:
   ```env
   # Development Environment Configuration
   VITE_API_BASE_URL=http://localhost:3001
   VITE_ENVIRONMENT=development
   
   # Enable Mock Data
   VITE_USE_MOCK_DATA=true
   VITE_USE_MOCK_AUTH=true
   VITE_ENABLE_DEVELOPMENT_TOOLS=true
   
   # Development Tools
   VITE_SHOW_API_LOGS=true
   VITE_MOCK_DELAY_MS=500
   VITE_SIMULATE_FAILURES=false
   ```

3. **Start development**:
   ```bash
   npm run dev
   ```

## What You Get

### 🔐 Fake Authentication System
- **Google OAuth**: Mock login flow that always succeeds
- **Meta Auth**: Fake Facebook/Instagram authentication  
- **Session Management**: Temporary sessions stored in memory
- **User Profiles**: Realistic user data with avatars

### 🏢 Mock Business Accounts
- **Multiple Account Types**: E-commerce, SaaS, Restaurant, Fitness, etc.
- **Realistic Data**: Business names, colors, and account IDs
- **Connected Services**: Google Ads, GA4, and Meta Ads integrations
- **Account Switching**: Test multi-account scenarios

### 📊 Fake Campaign Data
- **Google Ads Campaigns**: Search, Display, Shopping campaigns
- **Meta Ads Campaigns**: Facebook and Instagram ad campaigns
- **Performance Metrics**: Realistic impressions, clicks, conversions
- **Historical Data**: 30-90 days of performance history
- **Multiple Statuses**: Active, paused, and removed campaigns

### 📈 Mock Analytics & Insights
- **Performance Trends**: Daily/weekly/monthly data
- **Demographic Breakdowns**: Age, gender, location, device
- **Growth Metrics**: Period-over-period comparisons
- **Custom Date Ranges**: Flexible reporting periods

### 🛠️ Development Tools
- **API Request Logging**: See all requests in browser console
- **Network Simulation**: Add delays to simulate real network conditions  
- **Failure Testing**: Randomly fail requests to test error handling
- **Data Refresh**: Generate new mock data on page reload

## Configuration Options

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_USE_MOCK_DATA` | Enable/disable all mock data | `false` | `true` |
| `VITE_USE_MOCK_AUTH` | Enable mock authentication | `false` | `true` |
| `VITE_SHOW_API_LOGS` | Log API requests to console | `false` | `true` |
| `VITE_MOCK_DELAY_MS` | Simulate network delay (ms) | `500` | `1000` |
| `VITE_SIMULATE_FAILURES` | Random API failures | `false` | `true` |

### Mock Data Customization

#### Adding Custom Users
Edit `src/mock/data/users.ts`:
```typescript
export const mockUsers: UserProfile[] = [
  {
    name: 'Your Name',
    email: 'your.email@company.com',
    picture_url: 'https://your-avatar-url.com/avatar.jpg',
    google_user_id: 'google_custom_id',
    meta_user_id: 'meta_custom_id'
  },
  // ... more users
]
```

#### Creating Custom Accounts
Edit `src/mock/data/accounts.ts`:
```typescript
export const mockAccounts: AccountMapping[] = [
  {
    id: 'your_account_id',
    name: 'Your Test Business',
    google_ads_id: 'gads_123456',
    ga4_property_id: 'ga4_654321',
    meta_ads_id: 'meta_ads_789',
    business_type: 'Your Industry',
    color: '#FF5733',
    display_name: 'Your Business'
  },
  // ... more accounts
]
```

## Testing Different Scenarios

### Authentication States
```typescript
// Test unauthenticated state
localStorage.clear()
window.location.reload()

// Test different user types  
// Users are randomly selected from mock data
```

### Account Selection
```typescript
// Test businesses with different integrations
// Some accounts have Google Ads only
// Some have both Google Ads and Meta Ads
// Some have GA4 properties
```

### Campaign Performance
```typescript
// Test different performance levels
// High-performing campaigns: >5% CTR, >8% conversion rate
// Average campaigns: 2-4% CTR, 3-6% conversion rate
// Low-performing campaigns: <2% CTR, <3% conversion rate
```

### API Error Handling
```typescript
// Enable failure simulation
VITE_SIMULATE_FAILURES=true

// This will randomly fail ~5% of API requests
// Test your error handling and retry logic
```

## Switching Between Mock and Production

### Development Mode (Mock Data)
```env
VITE_ENVIRONMENT=development
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:3001
```

### Production Mode (Real APIs)
```env
VITE_ENVIRONMENT=production
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://your-production-api.com
```

### Testing Production APIs in Development
```env
VITE_ENVIRONMENT=development
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://your-staging-api.com
```

## Debugging

### Check Mock Status
Open browser console and look for:
```
[MIA SDK] Using mock data for development
[MOCK] Mock Fetch: GET /api/auth/status
```

### Verify Environment Variables
Check that environment variables are loaded:
```javascript
console.log('Mock enabled:', import.meta.env.VITE_USE_MOCK_DATA)
console.log('Environment:', import.meta.env.VITE_ENVIRONMENT)
```

### API Request Logging
Enable detailed logging:
```env
VITE_SHOW_API_LOGS=true
```

This will log every API request:
```
[MOCK] Mock Fetch: POST /api/oauth/google/exchange
[MOCK] Returning mock auth response
[MOCK] Request completed in 500ms
```

## Advanced Usage

### Custom Mock Endpoints
Add new mock endpoints in `src/mock/services/mockFetch.ts`:

```typescript
// Add your custom endpoint
if (path.includes('/api/your-endpoint')) {
  return {
    success: true,
    data: { your: 'custom data' }
  }
}
```

### Dynamic Mock Data
Generate data based on request parameters:

```typescript
if (path.includes('/api/campaigns')) {
  const accountId = urlObj.searchParams.get('account_id')
  const timeRange = urlObj.searchParams.get('timeRange') || '30d'
  
  return {
    success: true,
    data: generateCampaignsForAccountAndTimeRange(accountId, timeRange)
  }
}
```

### Stateful Mock Behavior
Use localStorage or sessionStorage to maintain state:

```typescript
// Remember user preferences
const userPrefs = JSON.parse(localStorage.getItem('mockUserPrefs') || '{}')

// Return personalized mock data
return generatePersonalizedData(userPrefs)
```

## Integration with Tests

### Unit Testing with Mock Data
```typescript
import { mockUsers, mockAccounts } from '../mock'

describe('UserService', () => {
  it('should handle user data', () => {
    const user = mockUsers[0]
    expect(user.email).toBeDefined()
    expect(user.google_user_id).toBeDefined()
  })
})
```

### E2E Testing
```typescript
// In your Playwright/Cypress tests
beforeEach(() => {
  // Enable mock data for consistent testing
  cy.window().then(win => {
    win.localStorage.setItem('forceMockData', 'true')
  })
})
```

## Troubleshooting

### Common Issues

**Mock data not loading**
- Restart dev server after changing `.env`
- Check browser console for error messages  
- Verify `VITE_USE_MOCK_DATA=true` in `.env`

**Authentication not working**
- Ensure `VITE_USE_MOCK_AUTH=true`
- Clear localStorage and try again
- Check network tab for API requests

**Missing campaign data**
- Mock data is generated randomly
- Refresh page to see different data
- Check account has associated campaigns

**TypeScript errors**
- Run `npm run build` to check for type errors
- Restart TypeScript language server in IDE

### Getting Help

1. Check browser console for `[MOCK]` log messages
2. Verify environment variables are set correctly
3. Look at network tab to see if requests are being intercepted
4. Check mock data files in `src/mock/data/` for available data
