# Technical Architecture - AI Email Agent

## System Overview

The AI Email Agent is built as a modern, scalable web application with clear separation between frontend, backend, and AI processing layers. The architecture prioritizes cost-effectiveness, speed, and security while maintaining flexibility for future enhancements.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Layer      │
│   React + TS    │◄──►│   Node.js       │◄──►│   Groq LLaMA    │
│   shadcn/ui     │    │   Express       │    │   OpenAI GPT-4o │
│   Vite          │    │   Firebase      │    │   (Backup)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Gmail API     │    │   Vector DB     │
│   Real-time     │    │   OAuth 2.0     │    │   (Future)      │
│   Updates       │    │   Firestore     │    │   Embeddings    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Context for auth, TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time**: WebSocket connections for live updates

### Component Structure
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── email/        # Email-specific components
│   ├── auth/         # Authentication components
│   └── dashboard/    # Dashboard and analytics
├── contexts/
│   └── AuthContext.jsx  # User authentication state
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
└── pages/            # Route components
```

### Key Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: ARIA-compliant components from Radix UI
- **Type Safety**: Full TypeScript coverage with strict mode
- **Performance**: Code splitting and lazy loading for optimal bundle size

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API and WebSocket handling
- **Database**: Firebase Firestore for document storage
- **Authentication**: Firebase Authentication with Google OAuth
- **Queue System**: BullMQ with Redis for background job processing
- **Email Integration**: Gmail API with OAuth 2.0

### API Structure
```
server/
├── routes/
│   ├── auth.ts       # Authentication endpoints
│   ├── emails.ts     # Email management API
│   ├── profiles.ts   # Communication profile API
│   └── webhooks.ts   # Gmail webhook handlers
├── services/
│   ├── gmail.ts      # Gmail API integration
│   ├── ai.ts         # AI service orchestration
│   └── profiles.ts   # Profile management
├── middleware/
│   ├── auth.ts       # JWT token validation
│   └── rateLimit.ts  # API rate limiting
└── utils/
    ├── encryption.ts # Token encryption utilities
    └── validation.ts # Input validation schemas
```

### Data Models

#### User Profile
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
  lastLoginAt: Date;
  emailAccounts: EmailAccount[];
}
```

#### Email Account
```typescript
interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook';
  accessToken: string; // Encrypted
  refreshToken: string; // Encrypted
  isActive: boolean;
  connectedAt: Date;
  communicationProfile?: CommunicationProfile;
}
```

#### Communication Profile
```typescript
interface CommunicationProfile {
  userId: string;
  emailAccountId: string;
  analysisMetadata: {
    emailsAnalyzed: number;
    analysisDate: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  toneFormality: {
    formalityScore: Record<string, FeatureWithConfidence>;
    toneDistribution: Record<string, FeatureWithConfidence>;
    formalityTriggers: Array<{
      trigger: string;
      weight: number;
      confidence: number;
    }>;
  };
  // ... additional profile categories
}
```

## AI Processing Layer

### Primary AI Provider: Groq + LLaMA 3.1 8B
- **Speed**: Sub-second response times for real-time draft generation
- **Cost**: Significantly lower cost per token compared to OpenAI
- **Quality**: Sufficient for email analysis and generation tasks
- **Scalability**: High throughput for concurrent user processing

### Backup AI Provider: OpenAI GPT-4o
- **Use Cases**: Complex analysis requiring higher reasoning capability
- **Fallback**: When Groq is unavailable or rate-limited
- **Specialized Tasks**: Advanced context understanding and nuanced generation

### AI Processing Pipeline

#### Phase 1: Profile Generation (One-time, Heavy Analysis)
```typescript
// Triggered when user connects new email account
async function generateCommunicationProfile(emailAccountId: string) {
  // 1. Fetch ~50 most recent sent emails
  const emails = await gmailService.fetchSentEmails(emailAccountId, 50);
  
  // 2. Deep analysis with Groq LLaMA 3.1 8B
  const analysis = await groqAnalyzer.analyzeEmails(emails);
  
  // 3. Validate against Zod schema
  const validatedProfile = communicationProfileSchema.parse(analysis);
  
  // 4. Store full and summary profiles
  await profileService.saveProfile(emailAccountId, validatedProfile);
  
  return validatedProfile;
}
```

#### Phase 2: Real-time Draft Generation (Fast, Lean)
```typescript
// Triggered by incoming email
async function generateEmailDraft(incomingEmail: Email, emailAccountId: string) {
  // 1. Fetch lightweight summary profile
  const summaryProfile = await profileService.getSummaryProfile(emailAccountId);
  
  // 2. Construct lean prompt
  const prompt = constructLeanPrompt(incomingEmail, summaryProfile);
  
  // 3. Generate draft with Groq (sub-second response)
  const draft = await groqService.generateDraft(prompt);
  
  return draft;
}
```

## Data Storage Architecture

### Firebase Firestore Structure
```
users/
├── {userId}/
│   ├── profile: UserProfile
│   ├── email_accounts/
│   │   └── {accountId}/
│   │       ├── account_info: EmailAccount
│   │       ├── full_communication_profile: CommunicationProfile
│   │       ├── summary_communication_profile: SummaryProfile
│   │       └── email_drafts/
│   │           └── {draftId}: EmailDraft
│   └── analytics/
│       └── usage_stats: UsageAnalytics
```

### Security Rules
- Users can only access their own data
- Email tokens are encrypted before storage
- Communication profiles are user-scoped
- API keys and sensitive data stored in environment variables

## Real-time Communication

### WebSocket Implementation
- **Library**: ws (Node.js WebSocket library)
- **Authentication**: JWT token validation on connection
- **Events**: Email processing status, draft generation, profile updates
- **Scaling**: Connection pooling and load balancing for production

### Event Types
```typescript
interface WebSocketEvents {
  'email:received': { emailId: string; preview: string };
  'draft:generated': { draftId: string; content: string };
  'profile:updated': { accountId: string; status: string };
  'processing:status': { jobId: string; progress: number };
}
```

## Security Architecture

### Authentication & Authorization
- **Firebase Auth**: Google OAuth 2.0 for user authentication
- **JWT Tokens**: Secure API access with token validation middleware
- **Token Encryption**: AES-256 encryption for stored OAuth tokens
- **Rate Limiting**: API endpoint protection against abuse

### Data Privacy
- **Email Content**: Not stored permanently, processed in memory only
- **Profile Data**: Anonymized patterns only, no personal content
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Compliance**: GDPR-compliant data handling and user consent

### API Security
```typescript
// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Authentication middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Route-based lazy loading
- **Bundle Analysis**: Vite bundle analyzer for size optimization
- **Caching**: Service worker for offline functionality
- **Image Optimization**: WebP format with fallbacks

### Backend Optimization
- **Connection Pooling**: Database connection reuse
- **Caching**: Redis for frequently accessed data
- **Background Jobs**: Queue system for heavy processing
- **CDN**: Static asset delivery optimization

### AI Optimization
- **Model Selection**: Groq for speed, OpenAI for quality when needed
- **Prompt Engineering**: Optimized prompts for cost and accuracy
- **Batch Processing**: Group similar requests for efficiency
- **Caching**: Profile summaries cached for quick access

## Monitoring & Observability

### Application Monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Metrics**: Response times, throughput, error rates
- **User Analytics**: Feature usage and user journey tracking
- **AI Metrics**: Token usage, response quality, cost tracking

### Infrastructure Monitoring
- **Server Health**: CPU, memory, disk usage monitoring
- **Database Performance**: Query performance and connection health
- **API Monitoring**: Endpoint availability and response times
- **Third-party Services**: Gmail API, Groq API status monitoring

## Deployment Architecture

### Development Environment
- **Local Development**: Vite dev server + nodemon for hot reloading
- **Database**: Firebase emulator for local testing
- **Environment**: Docker containers for consistent development

### Production Environment
- **Frontend**: Static build deployed to CDN
- **Backend**: Node.js server on cloud platform (Railway, Vercel, etc.)
- **Database**: Firebase Firestore in production mode
- **Monitoring**: Application performance monitoring and alerting

### CI/CD Pipeline
- **Testing**: Automated unit and integration tests
- **Building**: Optimized production builds
- **Deployment**: Automated deployment on successful tests
- **Rollback**: Quick rollback capability for production issues