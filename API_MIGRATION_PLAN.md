# API Migration Plan: Separating MIA Frontend API Logic

## Executive Summary
This document outlines a detailed plan to extract the API logic from the MIA frontend into a separate, reusable codebase. This will enable better code organization, reusability across different clients, and independent testing.

## Current State Analysis

### API Logic Distribution
The API logic is currently spread across multiple files:
- **Services**: `/src/services/` (4 files)
  - `auth.ts`: Google authentication logic
  - `metaAuth.ts`: Meta authentication logic
  - `metaAds.ts`: Meta advertising API calls
  - `accountService.ts`: Account management and MCP integration
- **Utilities**: `/src/utils/`
  - `api.ts`: Core API configuration and fetch wrapper
  - `clearMetaAuth.ts`: Meta logout utility
- **Components**: Direct API calls in 15+ components
- **Contexts**: `SessionContext.tsx` contains significant API logic

### Dependencies on Browser APIs
- `localStorage`: Used for session persistence
- `sessionStorage`: Used for temporary data
- `window.location`: Used for redirects and URL parsing
- `window.open`: Used for OAuth popups

## Migration Architecture

### 1. New Package Structure
```
@mia/api-client/
├── src/
│   ├── core/
│   │   ├── ApiClient.ts
│   │   ├── ApiConfig.ts
│   │   ├── ApiError.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── MetaAuthService.ts
│   │   ├── MetaAdsService.ts
│   │   ├── AccountService.ts
│   │   ├── InsightsService.ts
│   │   ├── ChatService.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── meta.types.ts
│   │   ├── account.types.ts
│   │   ├── insights.types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   ├── url.ts
│   │   └── index.ts
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Core API Client Design

```typescript
// ApiConfig.ts
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ApiClientConfig {
  baseUrl: string;
  storage?: StorageAdapter;
  onAuthError?: () => void;
  headers?: Record<string, string>;
}

// ApiClient.ts
export class ApiClient {
  private config: ApiClientConfig;
  private services: {
    auth: AuthService;
    metaAuth: MetaAuthService;
    metaAds: MetaAdsService;
    accounts: AccountService;
    insights: InsightsService;
    chat: ChatService;
  };

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.initializeServices();
  }

  // Core fetch wrapper
  async fetch(path: string, options?: RequestInit): Promise<Response> {
    const url = this.createUrl(path);
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.config.headers,
        ...options?.headers,
      },
    });

    if (response.status === 401 && this.config.onAuthError) {
      this.config.onAuthError();
    }

    return response;
  }
}
```

## Phase 1: Preparation (Week 1)

### Tasks:
1. **Create new package repository**
   - Initialize TypeScript project
   - Set up build tools (Rollup/Vite)
   - Configure testing framework (Jest/Vitest)

2. **Extract type definitions**
   - Identify all API-related types
   - Create comprehensive type definitions
   - Document type usage

3. **Design storage abstraction**
   - Create storage adapter interface
   - Implement browser storage adapter
   - Design mock storage for testing

## Phase 2: Core Implementation (Week 2-3)

### Tasks:
1. **Implement core API client**
   - Create base ApiClient class
   - Implement fetch wrapper with error handling
   - Add request/response interceptors

2. **Migrate service classes**
   - Extract and refactor AuthService
   - Extract and refactor MetaAuthService
   - Extract and refactor MetaAdsService
   - Extract and refactor AccountService

3. **Create new service classes**
   - InsightsService (for all insights endpoints)
   - ChatService (for chat functionality)
   - IntegrationsService (for third-party integrations)

4. **Remove browser dependencies**
   - Replace direct localStorage usage
   - Abstract window.location usage
   - Create OAuth popup handler abstraction

## Phase 3: Testing & Documentation (Week 4)

### Tasks:
1. **Unit tests**
   - Test all service methods
   - Test error handling
   - Test storage abstraction

2. **Integration tests**
   - Test authentication flows
   - Test data fetching scenarios
   - Test error recovery

3. **Documentation**
   - API reference documentation
   - Migration guide for frontend
   - Example usage patterns

## Phase 4: Frontend Migration (Week 5-6)

### Tasks:
1. **Install new package**
   ```bash
   npm install @mia/api-client
   ```

2. **Update imports**
   - Replace service imports
   - Update utility imports
   - Update type imports

3. **Initialize API client**
   ```typescript
   // In main.tsx or App.tsx
   import { ApiClient, BrowserStorageAdapter } from '@mia/api-client';

   const apiClient = new ApiClient({
     baseUrl: import.meta.env.VITE_API_BASE_URL,
     storage: new BrowserStorageAdapter(),
     onAuthError: () => {
       // Handle global auth errors
       window.location.href = '/login';
     }
   });

   // Provide via context or prop drilling
   ```

4. **Update components**
   - Replace direct API calls with client methods
   - Update error handling
   - Test all functionality

## Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Document all API endpoints
- [ ] Identify all API call locations
- [ ] Create migration branch

### Package Creation
- [ ] Initialize package repository
- [ ] Set up TypeScript configuration
- [ ] Configure build process
- [ ] Set up testing framework
- [ ] Configure CI/CD

### Code Migration
- [ ] Extract type definitions
- [ ] Implement storage abstraction
- [ ] Create ApiClient core
- [ ] Migrate AuthService
- [ ] Migrate MetaAuthService
- [ ] Migrate MetaAdsService
- [ ] Migrate AccountService
- [ ] Create InsightsService
- [ ] Create ChatService
- [ ] Remove browser dependencies

### Testing
- [ ] Unit tests for all services
- [ ] Integration tests for flows
- [ ] Mock implementations
- [ ] Error scenario testing

### Frontend Integration
- [ ] Install package
- [ ] Update imports
- [ ] Initialize client
- [ ] Update components
- [ ] Test all features
- [ ] Performance testing

### Documentation
- [ ] API reference
- [ ] Migration guide
- [ ] Usage examples
- [ ] Troubleshooting guide

## Risk Mitigation

### Potential Risks:
1. **Breaking changes in API behavior**
   - Mitigation: Comprehensive testing, gradual rollout

2. **Performance degradation**
   - Mitigation: Performance benchmarks, optimization

3. **OAuth flow disruption**
   - Mitigation: Careful testing of auth flows

4. **Type mismatches**
   - Mitigation: Strict TypeScript configuration

## Success Metrics

1. **Code Quality**
   - 90%+ test coverage
   - Zero TypeScript errors
   - Consistent API design

2. **Performance**
   - No increase in bundle size
   - Same or better API response times
   - Efficient caching

3. **Developer Experience**
   - Clear documentation
   - Easy integration
   - Good error messages

## Example Usage After Migration

```typescript
// Initialize client
import { createApiClient } from '@mia/api-client';

const api = createApiClient({
  baseUrl: 'https://api.mia.com',
  storage: window.localStorage,
});

// Use in components
function MyComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.checkStatus()
      .then(setUser)
      .catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      const authUrl = await api.auth.getAuthUrl();
      // Handle OAuth flow
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

## Timeline Summary

- **Week 1**: Preparation and setup
- **Week 2-3**: Core implementation
- **Week 4**: Testing and documentation
- **Week 5-6**: Frontend migration
- **Week 7**: Buffer and final testing

Total estimated time: 7 weeks

## Next Steps

1. Review and approve migration plan
2. Set up new package repository
3. Begin Phase 1 implementation
4. Schedule regular progress reviews
