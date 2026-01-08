/**
 * Health Check Routes
 *
 * Simple endpoints to verify server is running.
 */

const express = require("express");
const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get("/", (req, res) => {
  res.json({ status: "ok", message: "PDF server is running" });
});

module.exports = router;
