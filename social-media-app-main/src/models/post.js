const { query } = require("../utils/database");

/**
 * Post model for database operations
 */


 const createPost = async ({
  user_id,
  content,
  media_url,
  comments_enabled = true,
}) => {
  const result = await query(
    `INSERT INTO posts (user_id, content, media_url, comments_enabled, created_at, is_deleted)
     VALUES ($1, $2, $3, $4, NOW(), false)
     RETURNING id, user_id, content, media_url, comments_enabled, created_at`,
    [user_id, content, media_url, comments_enabled]
  );

  return result.rows[0];
};


/**
 * Get post by ID
 * @param {number} postId - Post ID
 * @returns {Promise<Object|null>} Post object or null
 */
const getPostById = async (postId) => {
  const result = await query(
    `SELECT p.*, u.username, u.full_name
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = $1`,
    [postId],
  );

  return result.rows[0] || null;
};

/**
 * Get posts by user ID
 * @param {number} userId - User ID
 * @param {number} limit - Number of posts to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of posts
 */
const getPostsByUserId = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT p.*, u.username, u.full_name
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return result.rows;
};



 const deletePost = async (postId, userId) => {
  const result = await query(
    `UPDATE posts 
     SET is_deleted = true 
     WHERE id = $1 AND user_id = $2`,
    [postId, userId]
  );

  return result.rowCount > 0;
};


// TODO: Implement getFeedPosts function that returns posts from followed users
/**
 * Get feed posts for a user
 */
const getFeedPosts = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `
    SELECT p.*, u.username, u.full_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.is_deleted = false
      AND (
        p.user_id = $1
        OR p.user_id IN (
          SELECT followee_id
          FROM follows
          WHERE follower_id = $1
        )
      )
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );

  return result.rows;
};


/**
 * Update a post
 */
const updatePost = async (postId, userId, data) => {
  const { content, media_url, comments_enabled } = data;

  const result = await query(
    `
    UPDATE posts
    SET
      content = COALESCE($1, content),
      media_url = COALESCE($2, media_url),
      comments_enabled = COALESCE($3, comments_enabled),
      updated_at = NOW()
    WHERE id = $4
      AND user_id = $5
      AND is_deleted = false
    RETURNING id, user_id, content, media_url, comments_enabled, updated_at
    `,
    [content, media_url, comments_enabled, postId, userId]
  );

  return result.rows[0] || null;
};


// TODO: Implement updatePost function for editing posts
/**
 * Search posts by content
 */
const searchPosts = async (keyword, limit = 20, offset = 0) => {
  const result = await query(
    `
    SELECT p.*, u.username, u.full_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.is_deleted = false
      AND p.content ILIKE $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [`%${keyword}%`, limit, offset]
  );

  return result.rows;
};


// TODO: Implement searchPosts function for content search



module.exports = {
  createPost,
  getPostById,
  getPostsByUserId,
  getFeedPosts,
  updatePost,
  searchPosts,
  deletePost,
};
