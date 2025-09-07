import express, {typeRequest, Response, NextFunction} from 'express';
import {setupVite, serveStatic, log} from './vite.js';
import {registerRoutes} from './routes.js';
import {createServer} from 'http';
import {wsManager} from './lib/websocket.js';
import {redis} from './lib/queue.js';
import cors from 'cors';
import {PollingService} from './services/polling.service.js';

const app = express();

// Enable CORS for all routes
const allowedOrigins = process.env.NODE_ENV === 'production' ? ['https://yourapp.com'] // Replace with your production domain : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
    origin: (origin, callback) => { // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) 
            return callback(null, true);
        


        // In development, allow all localhost origins
        if (process.env.NODE_ENV === 'development' && origin ?. includes('localhost')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn(msg);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Requested-With'
    ],
    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
        'PATCH'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Initialize server
const httpServer = createServer(app);

// Initialize WebSocket manager
wsManager.initialize(httpServer);

// Register routes
registerRoutes(app);

// Error handling
app.use((err
: any, _req
: Request, res
: Response, _next
: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({message});
    if (status === 500) 
        console.error(err);
    


});

// Vite dev server in development
if (process.env.NODE_ENV === 'development') {
    setupVite(app, httpServer).catch(console.error);
} else { // In production, serve static files from the dist directory
    const staticPath = process.cwd() + '/dist';
    app.use(express.static(staticPath));
    // Handle SPA fallback
    app.get('*', (req, res) => {
        res.sendFile(staticPath + '/index.html');
    });
}

// Initialize Redis connection (if available)
if (redis) {
    redis.on('connect', () => {
        log('Connected to Redis');
    });

    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    log('Shutting down server...');

    try { // Close WebSocket connections
        wsManager.close();

        // Close Redis connection (if available)
        if (redis) 
            await redis.quit();
        


        // Close HTTP server
        httpServer.close(() => {
            log('Server shut down gracefully');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Add endpoint to control polling service
app.post('/api/polling/:action', (req, res) => {
    const {action} = req.params;

    if (action === 'start') {
        PollingService.start();
        res.json({status: 'success', message: 'Polling service started'});
    } else if (action === 'stop') {
        PollingService.stop();
        res.json({status: 'success', message: 'Polling service stopped'});
    } else if (action === 'status') {
        res.json({status: 'success', isRunning: PollingService.isRunning});
    } else {
        res.status(400).json({status: 'error', message: 'Invalid action. Use start, stop, or status'});
    }
});

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n> Server is running on http://localhost:${PORT}`);

    // Start the polling service only if POLLING_ENABLED is explicitly set to 'true'
    // Webhooks should be the primary method, polling is fallback only
    if (process.env.POLLING_ENABLED === 'true') {
        console.log('⚠️  Polling service enabled - this should only be used as fallback when webhooks fail');
        PollingService.start();
    } else {
        console.log('✅ Polling service disabled - using webhooks for real-time email processing');
    }

    log(`WebSocket server available at ws://localhost:${PORT}/ws`);

    // In development, log the Vite dev server URL
    if (process.env.NODE_ENV === 'development') {
        log(`Vite dev server running on http://localhost:${PORT}`);
    }
});
