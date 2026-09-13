import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as admin from '../services/admin.service.js';
import * as chat from '../services/chat.service.js';
import * as trades from '../services/trade.service.js';
import { kycDecisionBody, listTradesQuery, listUsersQuery, updateUserStatusBody } from '../validators/admin.js';
import { idParams } from '../validators/common.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json(await admin.getOverview());
  }),
);

router.get(
  '/users',
  validate({ query: listUsersQuery }),
  asyncHandler(async (req, res) => {
    res.json(await admin.listUsers(req.valid.query));
  }),
);

router.get(
  '/users/:id',
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json(await admin.getUser(req.valid.params.id));
  }),
);

router.patch(
  '/users/:id/status',
  validate({ params: idParams, body: updateUserStatusBody }),
  asyncHandler(async (req, res) => {
    res.json(await admin.setUserStatus(req.user, req.valid.params.id, req.valid.body.status));
  }),
);

router.post(
  '/kyc/:id',
  validate({ params: idParams, body: kycDecisionBody }),
  asyncHandler(async (req, res) => {
    res.json(await admin.reviewKyc(req.valid.params.id, req.valid.body.decision));
  }),
);

router.get(
  '/trades',
  validate({ query: listTradesQuery }),
  asyncHandler(async (req, res) => {
    res.json(await admin.listTrades(req.valid.query));
  }),
);

router.get(
  '/trades/:id',
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const [trade, messages] = await Promise.all([
      trades.getTradeDetails(req.user, req.valid.params.id),
      chat.listMessages(req.user, req.valid.params.id),
    ]);
    res.json({ ...trade, messages });
  }),
);

export default router;
