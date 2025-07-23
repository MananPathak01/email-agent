// server/routes/index.ts
import { Router } from 'express';
import { gmailRouter } from './gmail.routes';

const router = Router();

// Mount Gmail routes at /api/gmail
router.use('/gmail', gmailRouter);

export default router;