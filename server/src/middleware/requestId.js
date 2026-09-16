import { randomUUID } from 'node:crypto';

/**
 * Gives every request an id and echoes it back as `X-Request-Id`.
 *
 * When a trader reports that a release "did nothing", the id is what ties their
 * screenshot to the log line, the Prisma query and the Stellar submission. An id
 * supplied by a proxy is reused so a trace survives the hop.
 */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
