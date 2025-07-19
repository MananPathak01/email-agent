# AI-Powered Email Agent System - Replit.md

## Overview

This is an AI-powered email automation system that transforms traditional email management into a conversational AI experience. The system combines intelligent email processing with ChatGPT-like natural language interaction and contextual memory to create a proactive onboarding workflow management platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: TailwindCSS with CSS variables for theming
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon (serverless PostgreSQL)
- **AI Integration**: OpenAI GPT-4o for email analysis and response generation
- **Real-time**: WebSocket connections for live updates
- **Email Integration**: Gmail API with OAuth 2.0 authentication

### Key Components

1. **Email Processing Pipeline**
   - Automated email ingestion from Gmail accounts
   - AI-powered content analysis and classification
   - Context matching with existing onboarding workflows
   - Smart response generation with appropriate tone and content

2. **Conversational Interface**
   - Chat-style AI assistant for email management
   - Natural language command processing
   - Proactive workflow suggestions and notifications
   - Real-time updates via WebSocket connections

3. **Task Management System**
   - Automated task creation from email content
   - Progress tracking across multiple participants
   - Smart workflow routing and status management
   - Integration with email responses and follow-ups

4. **Vector Search & Context Memory**
   - Embedding-based similarity search for historical context
   - Relationship mapping between emails, tasks, and participants
   - Contextual response generation based on previous interactions

## Data Flow

1. **Email Ingestion**: Gmail APIs fetch emails → AI analysis for onboarding relevance
2. **Processing**: Email content analyzed → Tasks generated → Context stored with embeddings
3. **User Interaction**: Chat interface → AI processes requests → Database updates → Real-time notifications
4. **Response Generation**: AI generates contextual replies → Gmail API sends responses → Status tracking updates

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-4o for email analysis, response generation, and embeddings
- **Gmail API**: Email access, sending, and OAuth authentication
- **Neon Database**: Serverless PostgreSQL hosting
- **Google OAuth**: Authentication for Gmail access

### Key Libraries
- **@neondatabase/serverless**: Database connection with WebSocket support
- **drizzle-orm**: Type-safe SQL query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **ws**: WebSocket implementation for real-time features

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- Express server with tsx for TypeScript execution
- Automatic database schema synchronization with Drizzle

### Production Build
- Frontend: Vite builds optimized React bundle
- Backend: esbuild bundles Express server for Node.js
- Database: Drizzle migrations handle schema changes
- Environment: Supports Replit deployment with custom domains

### Configuration Requirements
- `DATABASE_URL`: Neon PostgreSQL connection string (✓ configured)
- `OPENAI_API_KEY`: OpenAI API access token (✓ configured)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Gmail OAuth credentials (needs setup - see GMAIL_SETUP.md)
- `GOOGLE_REDIRECT_URI`: OAuth callback URL (auto-configured for Replit)

## Recent Changes (January 2025)
- ✓ Created comprehensive navigation with Email Threads, Tasks, and Analytics pages
- ✓ Simplified sidebar to single "Add Email" button (removed duplicate account connection)
- ✓ Implemented working page navigation with wouter routing
- ✓ Added manual email creation with AI analysis and task generation
- ✓ Built task management interface with status updates
- ✓ Created analytics dashboard with completion metrics and visual charts
- → Next: Gmail API integration setup (requires user to configure Google OAuth)

The system follows a monorepo structure with shared TypeScript schemas, enabling type safety across the full stack while maintaining clear separation between client and server concerns.