const {
  createUser,
  getUserByUsername,
  verifyPassword,
} = require("../models/user");
const { generateToken } = require("../utils/jwt");
const logger = require("../utils/logger");

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.validatedData;

    // Create user
    const user = await createUser({ username, email, password, full_name });

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
    });

    logger.verbose(`New user registered: ${username}`);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
      },
      token,
    });
  } catch (error) {
    logger.critical("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Login user
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../utils/database");

const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    // 1️⃣ Find user by email
    const result = await query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};




/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    logger.critical("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
