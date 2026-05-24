const logger = require("../utils/logger");
const {
	likePost: likePostModel,
	unlikePost: unlikePostModel,
	getPostLikes: getPostLikesModel,
	getUserLikes: getUserLikesModel,
	hasUserLikedPost,
	countLikesForPost,
} = require("../models/like");
const { getPostById } = require("../models/post");

/**
 * Like a post
 */
const likePost = async (req, res) => {
	try {
		const { post_id } = req.validatedData;
		const userId = req.user.id;

		// Ensure the post exists
		const post = await getPostById(parseInt(post_id));
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const existing = await hasUserLikedPost(userId, post_id);
		if (existing) {
			return res.status(200).json({ message: "Post already liked" });
		}

		const like = await likePostModel(userId, post_id);
		const likesCount = await countLikesForPost(post_id);

		logger.verbose(`User ${userId} liked post ${post_id}`);
		return res.status(201).json({ message: "Post liked", like, likesCount });
	} catch (error) {
		logger.critical("Like post error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Unlike a post
 */
const unlikePost = async (req, res) => {
	try {
		const postId = parseInt(req.params.post_id);
		const userId = req.user.id;

		const success = await unlikePostModel(userId, postId);
		if (!success) {
			return res.status(404).json({ error: "Like not found" });
		}

		const likesCount = await countLikesForPost(postId);

		logger.verbose(`User ${userId} unliked post ${postId}`);
		return res.json({ message: "Post unliked", likesCount });
	} catch (error) {
		logger.critical("Unlike post error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Get likes for a post
 */
const getPostLikes = async (req, res) => {
	try {
		const postId = parseInt(req.params.post_id);
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 50;
		const offset = (page - 1) * limit;

		const likes = await getPostLikesModel(postId, limit, offset);
		const likesCount = await countLikesForPost(postId);

		res.json({ likes, likesCount, pagination: { page, limit, hasMore: likes.length === limit } });
	} catch (error) {
		logger.critical("Get post likes error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

/**
 * Get posts liked by a user
 */
const getUserLikes = async (req, res) => {
	try {
		const userId = parseInt(req.params.user_id);
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 50;
		const offset = (page - 1) * limit;

		const posts = await getUserLikesModel(userId, limit, offset);

		res.json({ posts, pagination: { page, limit, hasMore: posts.length === limit } });
	} catch (error) {
		logger.critical("Get user likes error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

module.exports = {
	likePost,
	unlikePost,
	getPostLikes,
	getUserLikes,
};
