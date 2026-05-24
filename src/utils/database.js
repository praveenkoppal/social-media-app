const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

let pool;
let schemaInitialized = false;

/**
 * Initialize database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
const initializePool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      // Pool options
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,

      // 🔴 REQUIRED for Railway public proxy
      ssl: {
        rejectUnauthorized: false,
      },
    });

    pool.on("connect", () => {
      logger.verbose("PostgreSQL pool created successfully");
    });

    pool.on("error", (err) => {
      logger.critical("Unexpected PostgreSQL idle client error", err);
      process.exit(1);
    });
  }
  return pool;
};

/**
 * Initialize database schema if tables don't exist
 */
const initializeSchema = async () => {
  if (schemaInitialized) return;

  try {
    const dbPool = initializePool();
    const client = await dbPool.connect();

    // Check if users table exists
    const result = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      )`
    );

    if (!result.rows[0].exists) {
      logger.verbose("Database schema not found. Initializing...");
      
      try {
        // Try to read schema file
        const schemaSQL = fs.readFileSync(
          path.join(__dirname, "../../sql/schema.sql"),
          "utf8"
        );
        
        // Execute schema with proper error handling
        await client.query(schemaSQL);
        logger.verbose("Database schema initialized successfully from file");
      } catch (fileError) {
        logger.critical("Failed to read or execute schema file. Using inline schema...", fileError.message);
        
        // Fallback: Execute inline schema
        const inlineSchema = `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(30) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            media_url TEXT,
            comments_enabled BOOLEAN DEFAULT TRUE,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ language 'plpgsql';

          CREATE TABLE IF NOT EXISTS likes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, post_id)
          );

          CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
          CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
          CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

          CREATE TABLE IF NOT EXISTS follows (
            id SERIAL PRIMARY KEY,
            follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (follower_id, followee_id)
          );

          CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
          CREATE INDEX IF NOT EXISTS idx_follows_followee_id ON follows(followee_id);
        `;
        
        await client.query(inlineSchema);
        logger.verbose("Database schema initialized successfully from inline script");
      }
    } else {
      logger.verbose("Database schema already exists");
    }

    schemaInitialized = true;
    client.release();
  } catch (error) {
    logger.critical("Failed to initialize database schema", error);
    throw error;
  }
};

/**
 * Connect to the database and test connection
 */
const connectDB = async () => {
  const maxAttempts = 5;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const dbPool = initializePool();
      const client = await dbPool.connect();

      // Simple health-check query
      await client.query("SELECT 1");

      logger.verbose(
        `Connected to PostgreSQL at ${host}:${port} (attempt ${attempt})`
      );

      client.release();

      // Initialize schema on first successful connection
      await initializeSchema();
      return;
    } catch (error) {
      logger.critical(
        `Attempt ${attempt} - Failed to connect to PostgreSQL at ${host}:${port}`,
        error.message || error
      );

      if (attempt === maxAttempts) {
        logger.critical("Exceeded maximum DB connection attempts");
        throw error;
      }

      // Exponential backoff
      const delayMs = 1000 * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
};

/**
 * Execute a SQL query
 * @param {string} text SQL query
 * @param {Array} params SQL parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params = []) => {
  const dbPool = initializePool();
  const start = Date.now();

  try {
    const result = await dbPool.query(text, params);
    const duration = Date.now() - start;

    logger.verbose("Executed query", {
      text,
      duration,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.critical("Database query error", error);
    throw error;
  }
};

/**
 * Get a client for transactions
 * @returns {Promise<Object>} PostgreSQL client
 */
const getClient = async () => {
  const dbPool = initializePool();
  return await dbPool.connect();
};

module.exports = {
  connectDB,
  query,
  getClient,
};
