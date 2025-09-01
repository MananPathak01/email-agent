# AI Email Workforce

An intelligent email automation system that learns your communication patterns and generates contextual responses using AI. Built with Groq + LLaMA 3.1 8B for fast, cost-effective email processing.

## Features
- 🤖 **AI-Powered Email Analysis** - Automatically analyzes incoming emails for intent, urgency, and category
- ⚡ **Fast Response Generation** - Uses Groq + LLaMA 3.1 8B for sub-second draft creation
- 📧 **Multi-Provider Support** - Gmail and Outlook integration via OAuth
- 🧠 **Pattern Learning** - Learns from your email history to match your communication style
- 💬 **Conversational Interface** - Chat with AI about your email patterns and workflows
- 📊 **Analytics Dashboard** - Track time saved, AI accuracy, and workflow performance
- 🔒 **Secure & Private** - Encrypted token storage, no email content stored permanently

## Tech Stack
- **Frontend**: React + TypeScript + Vite + shadcn/ui
- **Backend**: Node.js + Express + Firebase
- **AI**: Groq + LLaMA 3.1 8B (fast, cost-effective)
- **Queue**: BullMQ + Redis for background processing
- **Real-time**: WebSockets for live updates

## Quick Start
```bash
git clone <your-repo-url>
cd email-agent
npm install
cp .env.example .env
# Edit .env with your API keys (see SETUP.md for details)
npm run dev
```

## Setup Guide
📋 **See [SETUP.md](SETUP.md) for detailed setup instructions including:**
- API key configuration
- Firebase setup
- Google OAuth setup
- Environment variables
- Troubleshooting guide

## Documentation
- `SETUP.md` - Complete setup guide for new developers
- `docs/AI_OPTIMIZATION.md` - AI configuration and optimization
- `docs/SECURITY_PERFORMANCE_REVIEW.md` - Security and performance analysis
- `.kiro/specs/` - Project specifications and implementation plan

## Current Status
✅ **Phase 1 Complete**: UI prototype with mock data  
🚧 **Phase 2 In Progress**: Real API integration with Groq + LLaMA 3.1 8B

## License
MIT License