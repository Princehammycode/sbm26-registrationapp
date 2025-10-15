const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

/**
 * Generate JWT token
 */
function generateToken(username) {
  const payload = {
    username,
    timestamp: Date.now()
  };

  const options = {
    expiresIn: '6h' // Token expires in 6 hours
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify admin credentials
 */
function verifyCredentials(username, password) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  return username === adminUsername && password === adminPassword;
}

module.exports = {
  verifyToken,
  generateToken,
  verifyCredentials
};
