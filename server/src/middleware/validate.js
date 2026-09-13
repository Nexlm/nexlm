/**
 * Validates request parts with zod schemas and exposes the parsed values on
 * `req.valid.{body,query,params}`. Parse errors are forwarded to the error handler.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    req.valid ??= {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  } catch (err) {
    next(err);
  }
};
