const jwt = require("jsonwebtoken");
const logger = require("./logger");

/**
 * Generate JWT token for user authentication
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

/**
 * Verify JWT token or Authorization header
 * @param {string} authHeader - Authorization header or raw token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (authHeader) => {
  if (!authHeader) {
    throw new Error("Access token required");
  }

  // Support "Bearer <token>" or a raw token string
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.critical("Token verification failed:", error.message || error);
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
