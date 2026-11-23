/**
 * Global error handling middleware conforming to `{ error: { code, message } }` envelope.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';

  // Do not expose raw internal error traces or secrets
  const message =
    statusCode < 500
      ? err.message || 'Client request error'
      : 'An unexpected internal server error occurred';

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
    },
  });
};

module.exports = errorHandler;
