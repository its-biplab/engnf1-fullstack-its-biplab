const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

/**
 * Handle new user registration.
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validate name: trimmed string, length 2 to 50
    if (typeof name !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required and must be between 2 and 50 characters',
        },
      });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name must be between 2 and 50 characters',
        },
      });
    }

    // 2. Validate email: valid email format, trimmed, lowercased, max 254 chars
    if (typeof email !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email address is required',
        },
      });
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0 || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email address is required (maximum 254 characters)',
        },
      });
    }

    // 3. Validate password: 8 to 64 chars, containing at least 1 letter and 1 digit
    if (typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be 8 to 64 characters long and include at least one letter and one number',
        },
      });
    }

    // 4. Check for existing email case-insensitively
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'An account with this email address already exists',
        },
      });
    }

    // 5. Hash password using bcryptjs with cost factor >= 10
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Create user with strictly enforced 'USER' role
    const newUser = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      role: 'USER', // Enforce 'USER' role, ignoring any role provided in request body
    });

    const userObj = newUser.toJSON();

    return res.status(201).json({
      user: {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.createdAt,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'An account with this email address already exists',
        },
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    // Forward unexpected errors to central error handler
    next(error);
  }
};

/**
 * Handle user login.
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // 1. Validate inputs: email (valid email, non-empty, normalized lowercase) and password (non-empty)
    if (typeof email !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email address is required',
        },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email address is required',
        },
      });
    }

    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password is required',
        },
      });
    }

    // 2. Look up user by lowercase email, explicitly selecting passwordHash
    const user = await User.findOne({ email: trimmedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid email or password',
        },
      });
    }

    // 3. Verify password against passwordHash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid email or password',
        },
      });
    }

    // 4. Sign JWT with user id and role
    const userId = user._id ? user._id.toString() : user.id;
    const payload = {
      id: userId,
      role: user.role,
    };

    const jwtSecret = process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(payload, jwtSecret, { expiresIn });

    const userObj = user.toJSON();

    return res.status(200).json({
      token,
      user: {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile.
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User account not found',
        },
      });
    }

    const userObj = user.toJSON();

    return res.status(200).json({
      user: {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
