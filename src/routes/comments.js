const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, createCommentSchema, updateCommentSchema } = require("../utils/validation");
const commentsController = require("../controllers/comments");

const router = express.Router();

/**
 * Comments routes
 */

// Create a comment
router.post("/", authenticateToken, validateRequest(createCommentSchema), commentsController.create);

// Update a comment
router.put("/:comment_id", authenticateToken, validateRequest(updateCommentSchema), commentsController.update);

// Delete a comment
router.delete("/:comment_id", authenticateToken, commentsController.remove);

// Get comments for a post
router.get("/post/:post_id", commentsController.getPostComments);

// Get comments by a user
router.get("/user/:user_id", commentsController.getUserComments);

module.exports = router;
