import express from 'express';
import { setupVite } from './vite.js';
import { registerRoutes } from './routes.js';
import { createServer } from 'http';
import cors from 'cors';
// Polling service will be imported dynamically

const app = express();

app.use(cors({
    origin: [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Alternative dev port
        'https://your-app.vercel.app', // Replace with your Vercel URL
        'https://yourdomain.com', // Replace with your custom domain
        'https://www.yourdomain.com' // Replace with www subdomain if using
    ],
    credentials: true
}));

app.use(express.json());

const httpServer = createServer(app);

registerRoutes(app);

if (process.env.NODE_ENV === 'development') {
    setupVite(app, httpServer).catch(console.error);
}

const PORT = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`);

    // Start watch maintenance service for PubSub
    const { WatchMaintenanceService } = await import('./services/watch-maintenance.service.js');
    WatchMaintenanceService.start();
    console.log('🔔 Watch maintenance service started');
});
