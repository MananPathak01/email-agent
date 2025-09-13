// server/routes/index.ts
import { Router } from 'express';
import { gmailRouter } from './gmail.routes';

const router = Router();

// Health check endpoint for Render
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Mount Gmail routes at /api/gmail
router.use('/gmail', gmailRouter);

export default router;