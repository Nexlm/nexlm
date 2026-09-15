/**
 * Wraps a route handler so both rejected promises and synchronous throws reach
 * the error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve()
    .then(() => fn(req, res, next))
    .catch(next);
};
