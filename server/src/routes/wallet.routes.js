import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveLimiter } from '../middleware/rateLimit.js';
import { requireVerifiedEmail } from '../middleware/requireTrading.js';
import { validate } from '../middleware/validate.js';
import * as wallet from '../services/wallet.service.js';
import { pageQuery } from '../validators/common.js';
import { activityQuery, withdrawBody } from '../validators/wallet.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await wallet.getWalletSummary(req.user));
  }),
);

router.get(
  '/deposit',
  asyncHandler(async (req, res) => {
    res.json(await wallet.getDepositInfo(req.user));
  }),
);

router.get(
  '/activity',
  validate({ query: activityQuery }),
  asyncHandler(async (req, res) => {
    res.json(await wallet.getActivity(req.user, req.valid.query));
  }),
);

router.get(
  '/transactions',
  validate({ query: z.object(pageQuery) }),
  asyncHandler(async (req, res) => {
    res.json(await wallet.listTransactions(req.user.id, req.valid.query));
  }),
);

router.post(
  '/withdraw',
  requireVerifiedEmail,
  sensitiveLimiter,
  validate({ body: withdrawBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await wallet.withdraw(req.user.id, req.valid.body));
  }),
);

export default router;
