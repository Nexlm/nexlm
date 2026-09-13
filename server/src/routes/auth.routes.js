import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as auth from '../services/auth.service.js';
import {
  changePasswordBody,
  forgotPasswordBody,
  loginBody,
  registerBody,
  resetPasswordBody,
  verifyEmailBody,
} from '../validators/auth.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate({ body: registerBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await auth.register(req.valid.body));
  }),
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    res.json(await auth.login(req.valid.body));
  }),
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post(
  '/verify-email',
  validate({ body: verifyEmailBody }),
  asyncHandler(async (req, res) => {
    const user = await auth.verifyEmail(req.valid.body.token);
    res.json({ user });
  }),
);

router.post(
  '/resend-verification',
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    await auth.resendVerification(req.user.id);
    res.json({ ok: true });
  }),
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordBody }),
  asyncHandler(async (req, res) => {
    await auth.requestPasswordReset(req.valid.body.email);
    res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordBody }),
  asyncHandler(async (req, res) => {
    await auth.resetPassword(req.valid.body);
    res.json({ ok: true });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordBody }),
  asyncHandler(async (req, res) => {
    await auth.changePassword(req.user.id, req.valid.body);
    res.json({ ok: true });
  }),
);

export default router;
