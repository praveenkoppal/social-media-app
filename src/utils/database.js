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
			// ensure port is a number; fallback to 5432
			port: parseInt(process.env.DB_PORT, 10) || 5432,
			database: process.env.DB_NAME,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			max: 20,
			idleTimeoutMillis: 30000,
			// increase connection timeout slightly to allow local DB to respond
			connectionTimeoutMillis: 5000,
		});

		pool.on("error", (err) => {
			logger.critical("Unexpected error on idle client", err);
		});
	}
	return pool;
};

/**
 * Connect to the database and test connection
 */
const connectDB = async () => {
	const maxAttempts = 5;
	const host = process.env.DB_HOST || "localhost";
	const port = process.env.DB_PORT || "5432";

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const dbPool = initializePool();
			const client = await dbPool.connect();
			// simple query to validate connection
			await client.query("SELECT 1");
			logger.verbose(`Connected to PostgreSQL database at ${host}:${port} (attempt ${attempt})`);
			client.release();
			return;
		} catch (error) {
			logger.critical(
				`Attempt ${attempt} - Failed to connect to database at ${host}:${port}:`,
				error.message || error
			);
			if (attempt === maxAttempts) {
				logger.critical("Exceeded maximum attempts to connect to the database");
				throw error;
			}
			// exponential backoff before retrying
			const delayMs = 1000 * Math.pow(2, attempt);
			await new Promise((res) => setTimeout(res, delayMs));
		}
	}
};

/**
 * Execute a database query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
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
		logger.critical("Database query error:", error);
		throw error;
	}
};

/**
 * Get a database client for transactions
 * @returns {Promise<Object>} Database client
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
