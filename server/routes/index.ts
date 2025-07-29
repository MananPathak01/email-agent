// server/routes/index.ts
import { Router } from 'express';
import { gmailRouter } from './gmail.routes';
import { testConnectionRouter } from './test-connection.routes';
import { minimalTestRouter } from './minimal-test.routes';

const router = Router();

// Mount Gmail routes at /api/gmail
router.use('/gmail', gmailRouter);

// Mount test connection routes at /api/test
router.use('/test', testConnectionRouter);

// Mount minimal test routes at /api/minimal
router.use('/minimal', minimalTestRouter);

export default router;