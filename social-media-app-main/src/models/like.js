const { query } = require("../utils/database");

/**
 * Like model for managing post likes
 */

/**
 * Like a post (idempotent)
 */
const likePost = async (userId, postId) => {
	const result = await query(
		`INSERT INTO likes (user_id, post_id)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id, post_id) DO NOTHING
		 RETURNING id, user_id, post_id, created_at`,
		[userId, postId]
	);
	return result.rows[0] || null;
};

/**
 * Unlike a post
 */
const unlikePost = async (userId, postId) => {
	const result = await query(
		`DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING id`,
		[userId, postId]
	);
	return result.rowCount > 0;
};

/**
 * Get likes for a post with user info
 */
const getPostLikes = async (postId, limit = 50, offset = 0) => {
	const result = await query(
		`SELECT l.id, l.user_id, l.post_id, l.created_at,
		        u.username, u.full_name
		 FROM likes l
		 JOIN users u ON u.id = l.user_id
		 WHERE l.post_id = $1
		 ORDER BY l.created_at DESC
		 LIMIT $2 OFFSET $3`,
		[postId, limit, offset]
	);
	return result.rows;
};

/**
 * Get posts liked by a user
 */
const getUserLikes = async (userId, limit = 50, offset = 0) => {
	const result = await query(
		`SELECT p.*, l.created_at AS liked_at
		 FROM likes l
		 JOIN posts p ON p.id = l.post_id
		 WHERE l.user_id = $1
		 ORDER BY l.created_at DESC
		 LIMIT $2 OFFSET $3`,
		[userId, limit, offset]
	);
	return result.rows;
};

/**
 * Check if a user has liked a post
 */
const hasUserLikedPost = async (userId, postId) => {
	const result = await query(
		`SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2 LIMIT 1`,
		[userId, postId]
	);
	return result.rowCount > 0;
};

/**
 * Count likes for a post
 */
const countLikesForPost = async (postId) => {
	const result = await query(
		`SELECT COUNT(*)::int AS count FROM likes WHERE post_id = $1`,
		[postId]
	);
	return result.rows[0].count || 0;
};

module.exports = {
	likePost,
	unlikePost,
	getPostLikes,
	getUserLikes,
	hasUserLikedPost,
	countLikesForPost,
};
