const jwt = require('jsonwebtoken');

/**
 * Reusable JWT Authentication Middleware.
 * Validates 'Authorization: Bearer <token>' header.
 * Enforces { error: { code, message } } envelope with HTTP 401 UNAUTHENTICATED.
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication token is missing or malformed',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Authentication token has expired'
        : 'Invalid authentication token';

    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message,
      },
    });
  }
};

/**
 * Optional RBAC middleware for role checking (e.g. requireRole(['ADMIN'])).
 * @param {string[]} roles
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  requireRole,
};
