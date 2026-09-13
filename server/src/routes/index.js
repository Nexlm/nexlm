import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimit.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import kycRoutes from './kyc.routes.js';
import orderRoutes from './orders.routes.js';
import tradeRoutes from './trades.routes.js';
import userRoutes from './users.routes.js';
import walletRoutes from './wallet.routes.js';

const router = Router();

router.use(apiLimiter);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/kyc', kycRoutes);
router.use('/wallet', walletRoutes);
router.use('/orders', orderRoutes);
router.use('/trades', tradeRoutes);
router.use('/admin', adminRoutes);

export default router;
