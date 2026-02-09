const { query } = require("../utils/database");

/**
 * Follow model for managing user relationships
 */

async function followUser(followerId, followeeId) {
    if (followerId === followeeId) {
        const err = new Error("Cannot follow yourself");
        err.code = "SELF_FOLLOW";
        throw err;
    }

    // Verify followee exists
    const userRes = await query("SELECT id FROM users WHERE id = $1", [followeeId]);
    if (userRes.rows.length === 0) {
        const err = new Error("Followee not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    // Use upsert-safe insert to avoid unique constraint errors
    await query(
        "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [followerId, followeeId]
    );

    return { ok: true };
}

async function unfollowUser(followerId, followeeId) {
    const res = await query(
        "DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2",
        [followerId, followeeId]
    );
    return res.rowCount > 0;
}

async function getFollowing(userId) {
    const result = await query(
        `SELECT u.id, u.username, u.full_name, f.created_at
         FROM follows f
         JOIN users u ON f.followee_id = u.id
         WHERE f.follower_id = $1`,
        [userId]
    );
    return result.rows;
}

async function getFollowers(userId) {
    const result = await query(
        `SELECT u.id, u.username, u.full_name, f.created_at
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.followee_id = $1`,
        [userId]
    );
    return result.rows;
}

async function getFollowCounts(userId) {
    const followingCount = await query(
        "SELECT COUNT(*) as count FROM follows WHERE follower_id = $1",
        [userId]
    );

    const followersCount = await query(
        "SELECT COUNT(*) as count FROM follows WHERE followee_id = $1",
        [userId]
    );

    return {
        following: parseInt(followingCount.rows[0].count),
        followers: parseInt(followersCount.rows[0].count)
    };
}

module.exports = {
    followUser,
    unfollowUser,
    getFollowing,
    getFollowers,
    getFollowCounts
};