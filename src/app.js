const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const logger = require("./utils/logger");
const path = require("path");
const { connectDB } = require("./utils/database");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const likeRoutes = require("./routes/likes");
const commentRoutes = require("./routes/comments");

/**
 * Express application setup and configuration
 */
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Simple request logging (helps debug route issues)
app.use((req, res, next) => {
	logger.verbose(`Incoming request: ${req.method} ${req.originalUrl}`);
	next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/comments", commentRoutes);

// Serve frontend static files
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));
// Fallback to index.html for client-side routing
app.get("/", (req, res) => res.sendFile(path.join(frontendDir, "index.html")));

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
	logger.critical("Unhandled error:", err);
	res.status(500).json({
		error: "Internal server error",
		...(process.env.NODE_ENV === "development" && { details: err.message }),
	});
});

// 404 handler for unknown API routes
app.use("/api/*", (req, res) => {
	res.status(404).json({ error: "Route not found" });
});

// All other routes - serve index (SPA fallback)
app.use("*", (req, res) => {
	res.sendFile(path.join(frontendDir, "index.html"));
});

/**
 * Start the server
 */
const listRoutes = () => {
	const routes = [];
	if (app && app._router && app._router.stack) {
		app._router.stack.forEach((layer) => {
			if (layer.route) {
				const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
				routes.push(`${methods} ${layer.route.path}`);
			} else if (layer.name === "router" && layer.handle && layer.handle.stack) {
				layer.handle.stack.forEach((handler) => {
					if (handler.route) {
						const methods = Object.keys(handler.route.methods).join(",").toUpperCase();
						routes.push(`${methods} ${handler.route.path}`);
					}
				});
			}
		});
	}
	logger.verbose("Registered routes:");
	routes.forEach((r) => logger.verbose(`  ${r}`));
};

const startServer = async () => {
	try {
		await connectDB();
		app.listen(PORT, () => {
			logger.verbose(`Server is running on port ${PORT}`);
			logger.verbose(
				`Environment: ${process.env.NODE_ENV || "development"}`
			);
			// Print mounted routes for debugging
			listRoutes();
		});
	} catch (error) {
		logger.critical("Failed to start server:", error);
		process.exit(1);
	}
};

startServer();

module.exports = app;
