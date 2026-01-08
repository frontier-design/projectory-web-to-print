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
