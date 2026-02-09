// TODO: Implement users controller

// This controller should handle:
// - Following a user
// - Unfollowing a user
// - Getting users that the current user is following
// - Getting users that follow the current user
// - Getting follow counts for a user

const logger = require("../utils/logger");

// TODO: Implement follow function
async function follow(req, res) {
    const { followeeId } = req.body;
    const followerId = req.user.id;

    try {
        await require("../models/follow").followUser(followerId, followeeId);
        res.status(200).json({ message: "User followed successfully" });
    } catch (error) {
        logger.error("Failed to follow user", error);
        res.status(500).json({ error: "Failed to follow user" });
    }
}

// TODO: Implement unfollow function
async function unfollow(req, res) {
    const { followeeId } = req.body;
    const followerId = req.user.id;

    try {
        await require("../models/follow").unfollowUser(followerId, followeeId);
        res.status(200).json({ message: "User unfollowed successfully" });
    } catch (error) {
        logger.error("Failed to unfollow user", error);
        res.status(500).json({ error: "Failed to unfollow user" });
    }
}

// TODO: Implement getMyFollowing function
async function getMyFollowing(req, res) {
    const userId = req.user.id;

    try {
        const following = await require("../models/follow").getFollowing(userId);
        res.status(200).json(following);
    } catch (error) {
        logger.error("Failed to retrieve following list", error);
        res.status(500).json({ error: "Failed to retrieve following list" });
    }
}

// TODO: Implement getMyFollowers function
async function getMyFollowers(req, res) {
    const userId = req.user.id;

    try {
        const followers = await require("../models/follow").getFollowers(userId);
        res.status(200).json(followers);
    } catch (error) {
        logger.error("Failed to retrieve followers list", error);
        res.status(500).json({ error: "Failed to retrieve followers list" });
    }
}

module.exports = {
	follow,
	unfollow,
	getMyFollowing,
	getMyFollowers
};
