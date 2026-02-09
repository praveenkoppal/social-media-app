const { query } = require("../utils/database");
const bcrypt = require("bcryptjs");

/**
 * User model for database operations
 */

/**
 /**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async ({ username, email, password, full_name }) => {
  // 1. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. Store HASHED password
  const result = await query(
    `INSERT INTO users (username, email, password_hash, full_name, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, username, email, full_name, created_at`,
    [username, email, hashedPassword, full_name] // ✅ FIX HERE
  );

    return result.rows[0];
  };

  /**
   * Find user by username
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} User object or null
   */
  const 
  getUserByUsername = async (username) => {
    const result = await query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    return result.rows[0] || null;
  };

  /**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const getUserById = async (id) => {
  const result = await query(
    "SELECT id, username, email, full_name, created_at FROM users WHERE id = $1",
    [id],
  );

  return result.rows[0] || null;
};

/**
 * Verify user password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} Password match result
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// TODO: Implement findUsersByName function for search functionality
// This should support partial name matching and pagination
const findUsersByName = async (name, currentUserId, limit = 10, offset = 0) => {
  const result = await query(
    `SELECT id, username, email, full_name, created_at
     FROM users
     WHERE full_name ILIKE $1 AND id != $2
     ORDER BY full_name
     LIMIT $3 OFFSET $4`,
    [`%${name}%`, currentUserId, limit, offset]
  );

  return result.rows;
};


// TODO: Implement getUserProfile function that includes follower/following counts
const getUserProfile = async (userId) => {
  const result = await query(`
    SELECT u.id, u.username, u.email, u.full_name, u.created_at,
           (SELECT COUNT(*) FROM follows WHERE follower_id = $1) AS following_count,
           (SELECT COUNT(*) FROM follows WHERE followee_id = $1) AS followers_count
    FROM users u
    WHERE u.id = $1
  `, [userId]);

  return result.rows[0] || null;
};


// TODO: Implement updateUserProfile function for profile updates
const updateUserProfile = async (userId, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`,
    values
  );

  return result.rows[0] || null;
};


module.exports = {

  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword,
  findUsersByName,
  getUserProfile,
  updateUserProfile
};
