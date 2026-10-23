const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

/**
 * Rate limiter for login attempts
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration form - DISABLED
 * Multiple devices and registration team need concurrent access
 */
// const registrationLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 3, // 3 registrations per IP
//   message: {
//     success: false,
//     message: 'Too many registration attempts. Please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * Rate limiter for admin API - DISABLED
 * Admin needs unlimited access for managing registrations
 */
// const adminApiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests
//   message: {
//     success: false,
//     message: 'Too many requests. Please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * Validation rules for registration
 */
const registrationValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens and apostrophes'),
  
  body('contact')
    .trim()
    .matches(/^\+?[0-9\s\-()]{7,20}$/)
    .withMessage('Please enter a valid phone number'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('memberStatus')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Attendee status must be less than 100 characters'),

  body('location')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  // Honeypot field - should be empty
  body('website')
    .isEmpty()
    .withMessage('Bot detected'),
];

/**
 * Middleware to check validation results
 */
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

module.exports = {
  loginLimiter,
  // registrationLimiter, // DISABLED - Multiple concurrent registrations needed
  // adminApiLimiter, // DISABLED - Admin needs unlimited access
  registrationValidation,
  checkValidation,
  sanitizeInput
};
