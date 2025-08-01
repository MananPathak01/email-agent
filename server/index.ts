import express, { type Request, Response, NextFunction } from 'express';
import { setupVite, serveStatic, log } from './vite';
import { registerRoutes } from './routes';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

declare module 'ws' {
  interface WebSocket {
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

const app = express();

// Enable CORS for all routes
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://yourapp.com'] // Replace with your production domain
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.warn(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize server
const httpServer = createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const connectedClients = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  const clientId = Math.random().toString(36).substring(7);
  connectedClients.set(clientId, ws);

  ws.on('close', () => {
    connectedClients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(clientId);
  });
});

// Register routes
registerRoutes(app);

// Add cron job management endpoints (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/cron/status', (req, res) => {
    res.json({ 
      message: 'Cron management available in development',
      instructions: 'Install node-cron and import localCron to start sync jobs'
    });
  });
}

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
  if (status === 500) console.error(err);
});

// Vite dev server in development
if (process.env.NODE_ENV === 'development') {
  setupVite(app, httpServer).catch(console.error);
} else {
  // In production, serve static files from the dist directory
  const staticPath = process.cwd() + '/dist';
  app.use(express.static(staticPath));
  // Handle SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(staticPath + '/index.html');
  });
}

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  log(`Server running on http://localhost:${PORT}`);
  
  // In development, log the Vite dev server URL
  if (process.env.NODE_ENV === 'development') {
    log(`Vite dev server running on http://localhost:${PORT}`);
  }
});
