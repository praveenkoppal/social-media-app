const logger = require("../utils/logger");
const {
	createComment: createCommentModel,
	getCommentById,
	updateComment: updateCommentModel,
	deleteComment: deleteCommentModel,
	getCommentsByPost: getCommentsByPostModel,
	getCommentsByUser: getCommentsByUserModel,
	countCommentsForPost,
} = require("../models/comment");
const { getPostById } = require("../models/post");

/**
 * Create a comment
 */
const create = async (req, res) => {
	try {
		const { post_id, content, parent_comment_id } = req.validatedData;
		const userId = req.user.id;

		const post = await getPostById(parseInt(post_id));
		if (!post || post.is_deleted) {
			return res.status(404).json({ error: "Post not found" });
		}

		if (post.comments_enabled === false) {
			return res.status(403).json({ error: "Comments are disabled for this post" });
		}

		const comment = await createCommentModel({ user_id: userId, post_id, content, parent_comment_id });
		const commentsCount = await countCommentsForPost(post_id);

		logger.verbose(`User ${userId} commented on post ${post_id}`);
		return res.status(201).json({ message: "Comment created", comment, commentsCount });
	} catch (error) {
		logger.critical("Create comment error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Update a comment
 */
const update = async (req, res) => {
	try {
		const { comment_id } = req.params;
		const { content } = req.validatedData;
		const userId = req.user.id;

		const updated = await updateCommentModel(parseInt(comment_id), userId, content);
		if (!updated) {
			return res.status(404).json({ error: "Comment not found or unauthorized" });
		}

		logger.verbose(`User ${userId} updated comment ${comment_id}`);
		return res.json({ message: "Comment updated", comment: updated });
	} catch (error) {
		logger.critical("Update comment error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Delete a comment
 */
const remove = async (req, res) => {
	try {
		const { comment_id } = req.params;
		const userId = req.user.id;

		const success = await deleteCommentModel(parseInt(comment_id), userId);
		if (!success) {
			return res.status(404).json({ error: "Comment not found or unauthorized" });
		}

		logger.verbose(`User ${userId} deleted comment ${comment_id}`);
		return res.json({ message: "Comment deleted" });
	} catch (error) {
		logger.critical("Delete comment error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Get comments for a post
 */
const getPostComments = async (req, res) => {
	try {
		const postId = parseInt(req.params.post_id);
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const offset = (page - 1) * limit;

		const comments = await getCommentsByPostModel(postId, limit, offset);
		const commentsCount = await countCommentsForPost(postId);

		return res.json({ comments, commentsCount, pagination: { page, limit, hasMore: comments.length === limit } });
	} catch (error) {
		logger.critical("Get post comments error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Get comments by a user
 */
const getUserComments = async (req, res) => {
	try {
		const userId = parseInt(req.params.user_id);
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const offset = (page - 1) * limit;

		const comments = await getCommentsByUserModel(userId, limit, offset);

		return res.json({ comments, pagination: { page, limit, hasMore: comments.length === limit } });
	} catch (error) {
		logger.critical("Get user comments error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = {
	create,
	update,
	remove,
	getPostComments,
	getUserComments,
};
