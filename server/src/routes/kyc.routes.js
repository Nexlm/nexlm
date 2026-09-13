import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as kyc from '../services/kyc.service.js';
import { submitKycBody } from '../validators/kyc.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await kyc.getKycStatus(req.user.id));
  }),
);

router.post(
  '/',
  authLimiter,
  validate({ body: submitKycBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await kyc.submitKyc(req.user, req.valid.body));
  }),
);

export default router;
