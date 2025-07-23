# Development Guide

## Prerequisites
- Node.js 16+
- npm or yarn
- Firebase project with Firestore
- Google Cloud Project with Gmail API enabled
- OpenAI API key

## Setup Instructions

### 1. Prerequisites
- Node.js 16+ (LTS recommended)
- npm or yarn
- Firebase project with Firestore enabled
- Google Cloud Project with Gmail API enabled
- OpenAI API key

### 2. Clone the Repository
```bash
git clone <repository-url>
cd email-agent
```

### 3. Install Dependencies
```bash
# Using npm
npm install

# OR using yarn
yarn install
```

### 4. Set Up Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/auth/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Application
NODE_ENV=development
PORT=3001
SESSION_SECRET=your-session-secret

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 5. Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Navigate to Project Settings > Service Accounts
4. Generate a new private key and save it securely
5. Copy the service account details to your `.env` file

### 6. Google Cloud Project Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Set up the consent screen with your app details
   - Add the following scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/userinfo.email`
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/gmail/auth/callback` (development)
     - `https://your-production-url.com/api/gmail/auth/callback` (production)
6. Copy the Client ID and Client Secret to your `.env` file

### 7. OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to "API Keys"
3. Create a new secret key and copy it to your `.env` file

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/auth/callback

# Encryption
EMAIL_AGENT_TOKEN_KEY=32_character_encryption_key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 4. Initialize Firebase
1. Go to Firebase Console
2. Create a new project
3. Enable Firestore Database
4. Generate a new private key for your service account
5. Update the Firebase config in `.env`

### 5. Set Up Google OAuth
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/gmail/auth/callback`
   - `http://localhost:3000/auth/callback`
4. Enable Gmail API

- `lint` - Run ESLint
  ```bash
  npm run lint
  # or
  yarn lint
  ```

- `format` - Format code with Prettier
  ```bash
  npm run format
  # or
  yarn format
  ```

## Development Workflow

### Branching Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches (e.g., `feature/email-templates`)
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Critical production fixes

### Code Style
- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

### Testing
- Unit tests: `npm test`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e`
- Test coverage: `npm run test:coverage`
npm run lint
```

## Deployment

### Firebase Hosting
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to Firebase:
   ```bash
   firebase login
   ```
3. Deploy:
   ```bash
   firebase deploy
   ```

## Troubleshooting

### Common Issues
1. **Firebase Authentication Fails**
   - Verify service account credentials
   - Check project ID in Firebase config

2. **Gmail API Errors**
   - Verify OAuth consent screen is configured
   - Check redirect URIs in Google Cloud Console

3. **Environment Variables Not Loading**
   - Ensure `.env` file is in the root directory
   - Restart the development server after changes

## Contributing
1. Create a new branch for your feature
2. Write tests for new functionality
3. Submit a pull request with a clear description of changes

## License
[Specify your license here]
