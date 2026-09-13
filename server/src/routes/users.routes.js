import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as users from '../services/user.service.js';
import { idParams } from '../validators/common.js';
import { paymentAccountBody, profileParams, updateProfileBody } from '../validators/users.js';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await users.getMe(req.user.id) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileBody }),
  asyncHandler(async (req, res) => {
    res.json({ user: await users.updateProfile(req.user.id, req.valid.body) });
  }),
);

router.get(
  '/me/payment-accounts',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ items: await users.listPaymentAccounts(req.user.id) });
  }),
);

router.post(
  '/me/payment-accounts',
  requireAuth,
  validate({ body: paymentAccountBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await users.addPaymentAccount(req.user.id, req.valid.body));
  }),
);

router.delete(
  '/me/payment-accounts/:id',
  requireAuth,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    await users.deletePaymentAccount(req.user.id, req.valid.params.id);
    res.status(204).end();
  }),
);

router.get(
  '/:displayName',
  validate({ params: profileParams }),
  asyncHandler(async (req, res) => {
    res.json(await users.getPublicProfile(req.valid.params.displayName));
  }),
);

export default router;
