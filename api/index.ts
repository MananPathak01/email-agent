import {VercelRequest, VercelResponse} from '@vercel/node';
import express from 'express';
import {registerRoutes} from '../server/routes.js';
import cors from 'cors';

const app = express();

// Enable CORS for Vercel deployment
app.use(cors({
    origin: true,
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
    ]
}));

app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Register your existing routes (without WebSocket server)
registerRoutes(app).catch(console.error);

// Export the Express app as a Vercel function
export default(req : VercelRequest, res : VercelResponse) => {
    return app(req as any, res as any);
};
