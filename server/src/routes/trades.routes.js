import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { requireTradingEligibility } from '../middleware/requireTrading.js';
import { singleImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as chat from '../services/chat.service.js';
import * as trades from '../services/trade.service.js';
import { idParams } from '../validators/common.js';
import { myTradesQuery, openTradeBody, sendMessageBody } from '../validators/trades.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  validate({ query: myTradesQuery }),
  asyncHandler(async (req, res) => {
    res.json(await trades.listMyTrades(req.user.id, req.valid.query));
  }),
);

router.post(
  '/',
  requireTradingEligibility,
  validate({ body: openTradeBody }),
  asyncHandler(async (req, res) => {
    const trade = await trades.openTrade(req.user, req.valid.body);
    res.status(201).json(await trades.getTradeDetails(req.user, trade.id));
  }),
);

router.get(
  '/:id',
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json(await trades.getTradeDetails(req.user, req.valid.params.id));
  }),
);

const action = (fn) =>
  asyncHandler(async (req, res) => {
    await fn(req.user, req.valid.params.id);
    res.json(await trades.getTradeDetails(req.user, req.valid.params.id));
  });

router.post('/:id/paid', validate({ params: idParams }), action(trades.markPaid));
router.post('/:id/release', validate({ params: idParams }), action(trades.releaseTrade));
router.post('/:id/cancel', validate({ params: idParams }), action(trades.cancelTrade));

router.get(
  '/:id/messages',
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json({ items: await chat.listMessages(req.user, req.valid.params.id) });
  }),
);

router.post(
  '/:id/messages',
  chatLimiter,
  singleImage('image'),
  validate({ params: idParams, body: sendMessageBody }),
  asyncHandler(async (req, res) => {
    const message = await chat.sendMessage(req.user, req.valid.params.id, {
      content: req.valid.body.content,
      file: req.file,
    });
    res.status(201).json(message);
  }),
);

export default router;
