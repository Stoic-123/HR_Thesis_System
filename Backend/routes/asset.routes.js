import express from 'express';
const router = express.Router();
import assetController from '../controller/asset.controller.js';
import { requireAuth } from '../middleware/auth.js'; 

router.use(requireAuth);

// CATEGORIES
router.get('/categories', assetController.getCategories);
router.post('/categories', assetController.createCategory);

// ASSETS
router.get('/', assetController.getAssets);
router.post('/', assetController.createAsset);

// DIRECT ASSIGNMENT
router.post('/:id/direct-assign', assetController.directAssign);

// RETURN ASSET
router.post('/:id/confirm-return', assetController.confirmReturn);

// REQUESTS
router.get('/requests', assetController.getRequests);
router.get('/requests/mobile', assetController.getRequestsMobile);
router.post('/requests', assetController.createRequest);
router.post('/requests/:id/approve-manager', assetController.approveManager);
router.post('/requests/:id/approve-hr', assetController.approveHR);

export default router;
