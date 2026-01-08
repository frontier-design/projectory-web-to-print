/**
 * Status Routes (SSE)
 * 
 * Server-Sent Events endpoints for real-time
 * progress updates to clients.
 */

const express = require("express");
const router = express.Router();
const { validateJobId } = require("../utils/validation");
const {
  jobProgress,
  registerJob,
  unregisterJob,
  hasJob,
} = require("../status/progress");
const config = require("../config");

/**
 * GET /test-sse/:jobId
 * Test SSE endpoint for verification
 */
router.get("/test-sse/:jobId", (req, res) => {
  const { jobId } = req.params;

  if (!validateJobId(jobId)) {
    return res.status(400).json({
      error: "Invalid jobId format",
      message: "jobId must be alphanumeric with hyphens, underscores, or dots",
    });
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  console.log(`[SSE Test] Connection established for jobId: ${jobId}`);

  // Send initial connection message
  try {
    res.write(`data: ${JSON.stringify({ type: "connected", jobId })}\n\n`);
  } catch (error) {
    console.error(`[SSE Test] Error sending initial message:`, error);
    return res.end();
  }

  // Send a few test messages
  let messageCount = 0;
  const testInterval = setInterval(() => {
    messageCount++;
    try {
      res.write(
        `data: ${JSON.stringify({
          type: "test",
          message: `Test message ${messageCount}`,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      if (messageCount >= 3) {
        clearInterval(testInterval);
        res.write(
          `data: ${JSON.stringify({
            type: "complete",
            message: "Test complete",
          })}\n\n`
        );
        setTimeout(() => res.end(), 100);
      }
    } catch (error) {
      console.error(`[SSE Test] Error sending test message:`, error);
      clearInterval(testInterval);
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on("close", () => {
    console.log(`[SSE Test] Client disconnected for jobId: ${jobId}`);
    clearInterval(testInterval);
    res.end();
  });
});

/**
 * GET /status/:jobId
 * Server-Sent Events endpoint for streaming progress updates
 */
router.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;

  // Validate jobId format
  if (!validateJobId(jobId)) {
    console.error(`[SSE] Invalid jobId format: ${jobId}`);
    res.status(400).json({
      error: "Invalid jobId format",
      message: "jobId must be alphanumeric with hyphens, underscores, or dots",
    });
    return;
  }

  console.log(`[SSE] Connection attempt for jobId: ${jobId}`);

  try {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Function to safely send progress update
    const sendProgress = (data) => {
      try {
        // Check if response is still writable
        if (res.writableEnded || res.destroyed) {
          console.warn(
            `[SSE] Attempted to write to closed connection for jobId: ${jobId}`
          );
          return false;
        }

        const message = `data: ${JSON.stringify(data)}\n\n`;
        res.write(message);
        return true;
      } catch (error) {
        console.error(
          `[SSE] Error writing progress for jobId ${jobId}:`,
          error.message
        );
        return false;
      }
    };

    // Send initial connection message
    if (!sendProgress({ type: "connected", jobId })) {
      console.error(
        `[SSE] Failed to send initial connection message for jobId: ${jobId}`
      );
      return res.end();
    }

    console.log(`[SSE] Connection established for jobId: ${jobId}`);

    // Register the job for progress tracking
    registerJob(jobId, res, sendProgress);

    // Track heartbeat interval for cleanup
    let heartbeatInterval = null;

    // Send periodic heartbeat to keep connection alive
    heartbeatInterval = setInterval(() => {
      if (!hasJob(jobId)) {
        clearInterval(heartbeatInterval);
        return;
      }

      try {
        if (!res.writableEnded && !res.destroyed) {
          res.write(`: heartbeat\n\n`);
        } else {
          console.log(
            `[SSE] Connection closed, stopping heartbeat for jobId: ${jobId}`
          );
          clearInterval(heartbeatInterval);
          unregisterJob(jobId);
        }
      } catch (error) {
        console.error(
          `[SSE] Error sending heartbeat for jobId ${jobId}:`,
          error.message
        );
        clearInterval(heartbeatInterval);
        unregisterJob(jobId);
      }
    }, config.heartbeatInterval);

    // Clean up on client disconnect
    req.on("close", () => {
      console.log(`[SSE] Client disconnected for jobId: ${jobId}`);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      unregisterJob(jobId);
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Handle errors
    req.on("error", (error) => {
      console.error(`[SSE] Request error for jobId ${jobId}:`, error.message);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      unregisterJob(jobId);
      if (!res.writableEnded) {
        res.end();
      }
    });

    res.on("error", (error) => {
      console.error(`[SSE] Response error for jobId ${jobId}:`, error.message);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      unregisterJob(jobId);
    });
  } catch (error) {
    console.error(
      `[SSE] Unexpected error setting up SSE for jobId ${jobId}:`,
      error
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to establish SSE connection" });
    } else {
      res.end();
    }
  }
});

module.exports = router;
