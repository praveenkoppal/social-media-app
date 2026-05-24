const { query } = require("../utils/database");

/**
 * Comment model for managing post comments
 */

const createComment = async ({ user_id, post_id, content, parent_comment_id = null }) => {
	const result = await query(
		`INSERT INTO comments (user_id, post_id, parent_comment_id, content, created_at, is_deleted)
		 VALUES ($1, $2, $3, $4, NOW(), false)
		 RETURNING id, user_id, post_id, parent_comment_id, content, created_at, updated_at`,
		[user_id, post_id, parent_comment_id, content]
	);
	return result.rows[0];
};

const getCommentById = async (commentId) => {
	const result = await query(
		`SELECT c.*, u.username, u.full_name
		 FROM comments c
		 JOIN users u ON u.id = c.user_id
		 WHERE c.id = $1`,
		[commentId]
	);
	return result.rows[0] || null;
};

const updateComment = async (commentId, userId, content) => {
	const result = await query(
		`UPDATE comments
		 SET content = $1, updated_at = NOW()
		 WHERE id = $2 AND user_id = $3 AND is_deleted = false
		 RETURNING id, user_id, post_id, parent_comment_id, content, updated_at`,
		[content, commentId, userId]
	);
	return result.rows[0] || null;
};

const deleteComment = async (commentId, userId) => {
	const result = await query(
		`UPDATE comments SET is_deleted = true WHERE id = $1 AND user_id = $2 RETURNING id`,
		[commentId, userId]
	);
	return result.rowCount > 0;
};

const getCommentsByPost = async (postId, limit = 20, offset = 0) => {
	const result = await query(
		`SELECT c.id, c.user_id, c.post_id, c.parent_comment_id, c.content, c.created_at, c.updated_at,
		        u.username, u.full_name
		 FROM comments c
		 JOIN users u ON u.id = c.user_id
		 WHERE c.post_id = $1 AND c.is_deleted = false
		 ORDER BY c.created_at ASC
		 LIMIT $2 OFFSET $3`,
		[postId, limit, offset]
	);
	return result.rows;
};

const getCommentsByUser = async (userId, limit = 20, offset = 0) => {
	const result = await query(
		`SELECT c.*, p.content AS post_content
		 FROM comments c
		 JOIN posts p ON p.id = c.post_id
		 WHERE c.user_id = $1 AND c.is_deleted = false
		 ORDER BY c.created_at DESC
		 LIMIT $2 OFFSET $3`,
		[userId, limit, offset]
	);
	return result.rows;
};

const countCommentsForPost = async (postId) => {
	const result = await query(`SELECT COUNT(*)::int AS count FROM comments WHERE post_id = $1 AND is_deleted = false`, [postId]);
	return result.rows[0].count || 0;
};

module.exports = {
	createComment,
	getCommentById,
	updateComment,
	deleteComment,
	getCommentsByPost,
	getCommentsByUser,
	countCommentsForPost,
};
