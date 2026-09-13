import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 400, 'VALIDATION_ERROR', details[0]?.message ?? 'Invalid request', details);
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message;
    return send(res, 400, 'UPLOAD_ERROR', message);
  }

  if (err?.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  if (err?.code === 'P2002') {
    return send(res, 409, 'CONFLICT', 'A record with these details already exists');
  }

  if (err?.code === 'P2025') {
    return send(res, 404, 'NOT_FOUND', 'Resource not found');
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.warn(err.message, { code: err.code, details: err.details, path: req.path });
    return send(res, err.status, err.code, err.message, err.details);
  }

  logger.error('Unhandled error', { err, method: req.method, path: req.path });
  return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
}
