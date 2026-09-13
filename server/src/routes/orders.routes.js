import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTradingEligibility } from '../middleware/requireTrading.js';
import { validate } from '../middleware/validate.js';
import * as orders from '../services/order.service.js';
import { idParams } from '../validators/common.js';
import { createOrderBody, listOrdersQuery, myOrdersQuery } from '../validators/orders.js';

const router = Router();

router.get(
  '/',
  validate({ query: listOrdersQuery }),
  asyncHandler(async (req, res) => {
    res.json(await orders.listOrders(req.valid.query));
  }),
);

router.get(
  '/mine',
  requireAuth,
  validate({ query: myOrdersQuery }),
  asyncHandler(async (req, res) => {
    res.json(await orders.listMyOrders(req.user.id, req.valid.query));
  }),
);

router.get(
  '/:id',
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json(await orders.getOrder(req.valid.params.id));
  }),
);

router.post(
  '/',
  requireAuth,
  requireTradingEligibility,
  validate({ body: createOrderBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await orders.createOrder(req.user, req.valid.body));
  }),
);

router.post(
  '/:id/cancel',
  requireAuth,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json(await orders.cancelOrder(req.user.id, req.valid.params.id));
  }),
);

export default router;
