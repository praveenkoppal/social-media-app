const express = require("express");
const { validateRequest, createPostSchema, updatePostSchema } = require("../utils/validation");
const {
  create,
  getById,
  getUserPosts,
  getMyPosts,
  getFeed,
  updatePost,
  remove,
} = require("../controllers/posts");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Posts routes
 */

// POST /api/posts - Create a new post
router.post(
  "/",
  authenticateToken,
  validateRequest(createPostSchema),
  create
);

// GET /api/posts/feed - Get content feed (users I follow + my posts)
router.get(
  "/feed",
  authenticateToken,
  getFeed
);

// GET /api/posts/my - Get current user's posts
router.get(
  "/my",
  authenticateToken,
  getMyPosts
);

// GET /api/posts/user/:user_id - Get posts by a specific user
router.get(
  "/user/:user_id",
  optionalAuth,
  getUserPosts
);

// GET /api/posts/:post_id - Get a single post by ID
router.get(
  "/:post_id",
  optionalAuth,
  getById
);

// PUT /api/posts/:post_id - Update a post
router.put(
  "/:post_id",
  authenticateToken,
  validateRequest(updatePostSchema),
  updatePost
);

// DELETE /api/posts/:post_id - Delete a post (soft delete)
router.delete(
  "/:post_id",
  authenticateToken,
  remove
);

module.exports = router;
