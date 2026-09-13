import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { sessionUserSelect } from '../lib/selects.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function extractToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export async function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(unauthorized());

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(unauthorized('Your session has expired. Please log in again.', 'SESSION_EXPIRED'));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: sessionUserSelect });
    if (!user) return next(unauthorized('Account no longer exists'));
    if (user.status !== 'ACTIVE') {
      return next(forbidden(`Your account is ${user.status.toLowerCase()}. Contact support.`, 'ACCOUNT_RESTRICTED'));
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') return next(forbidden('Admin access required'));
  next();
}
