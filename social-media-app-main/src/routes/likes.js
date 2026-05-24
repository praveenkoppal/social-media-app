const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, createLikeSchema } = require("../utils/validation");
const likesController = require("../controllers/likes");

const router = express.Router();

/**
 * Likes routes
 */

// Like a post
router.post("/", authenticateToken, validateRequest(createLikeSchema), likesController.likePost);

// Unlike a post
router.delete("/:post_id", authenticateToken, likesController.unlikePost);

// Get likes for a post (public)
router.get("/post/:post_id", likesController.getPostLikes);

// Get posts liked by a user (public)
router.get("/user/:user_id", likesController.getUserLikes);

module.exports = router;
