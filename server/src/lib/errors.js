export class AppError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(401, message, code);
export const forbidden = (message = 'You do not have access to this resource', code = 'FORBIDDEN') =>
  new AppError(403, message, code);
export const notFound = (message = 'Resource not found') => new AppError(404, message, 'NOT_FOUND');
export const conflict = (message, details) => new AppError(409, message, 'CONFLICT', details);
export const unprocessable = (message, code = 'UNPROCESSABLE', details) =>
  new AppError(422, message, code, details);
export const serviceUnavailable = (message, code = 'SERVICE_UNAVAILABLE', details) =>
  new AppError(503, message, code, details);
