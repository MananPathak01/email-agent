// server/routes/index.ts
import { Router } from 'express';
import { gmailRouter } from './gmail.routes';
import smartSyncRouter from './smartSync.routes';

const router = Router();

// Mount Gmail routes at /api/gmail
router.use('/gmail', gmailRouter);

// Mount smart sync routes at /api/smart-sync
router.use('/smart-sync', smartSyncRouter);

export default router;