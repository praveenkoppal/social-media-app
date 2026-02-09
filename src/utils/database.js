const { Pool } = require("pg");
const logger = require("./logger");

let pool;

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
