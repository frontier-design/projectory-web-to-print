/**
 * Route Index
 * 
 * Aggregates all routes for easy registration.
 */

const healthRoutes = require("./health");
const statusRoutes = require("./status");
const diagnosticsRoutes = require("./diagnostics");
const pdfRoutes = require("./pdf");

/**
 * Register all routes with the Express app
 * @param {Express} app - Express application instance
 */
function registerRoutes(app) {
  // Health check
  app.use("/health", healthRoutes);

  // Status/SSE endpoints
  app.use("/", statusRoutes);

  // Diagnostics
  app.use("/diagnostics", diagnosticsRoutes);

  // PDF generation
  app.use("/generate-pdfs", pdfRoutes);
}

module.exports = {
  registerRoutes,
  healthRoutes,
  statusRoutes,
  diagnosticsRoutes,
  pdfRoutes,
};
