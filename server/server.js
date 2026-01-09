/**
 * PDF Generation Server
 *
 * Main entry point for the server application.
 * Uses modular architecture with separate concerns.
 */

const express = require("express");
const cors = require("cors");
const config = require("./src/config");
const { registerRoutes } = require("./src/routes");

// Initialize Express app
const app = express();

// =============================================================================
// Middleware
// =============================================================================

// CORS configuration - allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

// Parse JSON bodies with increased limit
app.use(express.json({ limit: "50mb" }));

// =============================================================================
// Routes
// =============================================================================

// Register all routes
registerRoutes(app);

// =============================================================================
// Error Handling Middleware
// =============================================================================

// Global error handler - must be last middleware
// This catches any unhandled errors and ensures CORS headers are always set
app.use((err, req, res, next) => {
  // Always set CORS headers first
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Log error for debugging
  console.error("Unhandled error:", err);
  console.error("Error stack:", err.stack);

  // Send error response if headers haven't been sent yet
  if (!res.headersSent) {
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  } else {
    // If headers were already sent, try to end the response
    res.end();
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  res.status(404).json({ error: "Route not found" });
});

// =============================================================================
// Process Error Handlers
// =============================================================================

// Handle unhandled promise rejections
// This prevents the server from crashing on unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  // Don't exit - let the server continue running
  // The error will be caught by the global error handler if it occurs in a request
});

// Handle uncaught exceptions
// This catches synchronous errors that aren't caught by try-catch
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Error stack:", error.stack);
  // For uncaught exceptions, we should exit gracefully
  // But first, try to log and notify
  console.error("Server will exit due to uncaught exception");
  process.exit(1);
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(config.port, () => {
  console.log(`PDF Server running on http://localhost:${config.port}`);
  console.log("");
  console.log("Available endpoints:");
  console.log("  GET  /health          - Health check");
  console.log("  GET  /diagnostics     - Server diagnostics");
  console.log("  GET  /status/:jobId   - SSE progress updates");
  console.log("  GET  /test-sse/:jobId - Test SSE connection");
  console.log("  POST /generate-pdfs   - Generate PDF batch");
  console.log("  POST /debug-html      - Preview generated HTML");
});
