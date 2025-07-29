// server/routes/index.ts
import { Router } from 'express';
import { gmailRouter } from './gmail.routes';
import { testConnectionRouter } from './test-connection.routes';

const router = Router();

// Mount Gmail routes at /api/gmail
router.use('/gmail', gmailRouter);

// Mount test connection routes at /api/test
router.use('/test', testConnectionRouter);

export default router;