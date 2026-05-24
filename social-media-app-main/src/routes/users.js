const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { validateRequest, createFollowSchema } = require("../utils/validation");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * User-related routes
 * TODO: Implement user routes when follow functionality is added
 */

// TODO: POST /api/users/follow - Follow a user
router.post("/follow", authenticateToken, validateRequest(createFollowSchema), async (req, res) => {
    const { followeeId } = req.validatedData;
    const followerId = req.user.id;

    try {
        await require("../models/follow").followUser(followerId, followeeId);
        res.status(200).json({ message: "User followed successfully" });
    } catch (error) {
        if (error && error.code === "SELF_FOLLOW") {
            return res.status(400).json({ error: error.message });
        }
        if (error && error.code === "NOT_FOUND") {
            return res.status(404).json({ error: error.message });
        }
        logger.error("Failed to follow user", error);
        res.status(500).json({ error: "Failed to follow user" });
    }
});

// TODO: DELETE /api/users/unfollow - Unfollow a user
router.delete("/unfollow", authenticateToken, validateRequest(createFollowSchema), async (req, res) => {
    const { followeeId } = req.validatedData;
    const followerId = req.user.id;

    try {
        const removed = await require("../models/follow").unfollowUser(followerId, followeeId);
        if (!removed) {
            return res.status(404).json({ error: "Follow relationship not found" });
        }
        res.status(200).json({ message: "User unfollowed successfully" });
    } catch (error) {
        logger.error("Failed to unfollow user", error);
        res.status(500).json({ error: "Failed to unfollow user" });
    }
});

// TODO: GET /api/users/following - Get users that current user follows
router.get("/following", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const following = await require("../models/follow").getFollowing(userId);
        res.status(200).json(following);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve following list" });
    }
});

// TODO: GET /api/users/followers - Get users that follow current user
router.get("/followers", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const followers = await require("../models/follow").getFollowers(userId);
        res.status(200).json(followers);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve followers list" });
    }
});

// TODO: GET /api/users/stats - Get follow stats for current user
router.get("/stats", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const counts = await require("../models/follow").getFollowCounts(userId);
        res.status(200).json(counts);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve follow stats" });
    }
});

// TODO: POST /api/users/search - Find users by name
router.post("/search", authenticateToken, async (req, res) => {
    const { query } = req.body;
    const currentUserId = req.user.id;

    try {
        const results = await require("../models/user").findUsersByName(query, currentUserId);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to search users" });
    }
});

module.exports = router;
    

 
