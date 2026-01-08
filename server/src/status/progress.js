/**
 * Progress Tracking and SSE Management
 *
 * Handles job progress tracking and Server-Sent Events
 * for real-time status updates to clients.
 */

// In-memory store for job progress
const jobProgress = new Map();

/**
 * Register a new job for progress tracking
 * @param {string} jobId - Unique job identifier
 * @param {object} res - Express response object
 * @param {function} sendProgress - Function to send progress updates
 */
function registerJob(jobId, res, sendProgress) {
  const startTime = Date.now();
  jobProgress.set(jobId, { res, sendProgress, startTime });
}

/**
 * Unregister a job (cleanup)
 * @param {string} jobId - Unique job identifier
 */
function unregisterJob(jobId) {
  jobProgress.delete(jobId);
}

/**
 * Check if a job exists
 * @param {string} jobId - Unique job identifier
 * @returns {boolean}
 */
function hasJob(jobId) {
  return jobProgress.has(jobId);
}

/**
 * Get a job's data
 * @param {string} jobId - Unique job identifier
 * @returns {object|undefined}
 */
function getJob(jobId) {
  return jobProgress.get(jobId);
}

/**
 * Emit progress update to a job
 * @param {string} jobId - Unique job identifier
 * @param {string} type - Progress type (start, progress, batch-start, image-gen, etc.)
 * @param {string} message - Human-readable message
 * @param {object} data - Additional data to include
 * @returns {boolean} - True if successfully sent, false otherwise
 */
function emitProgress(jobId, type, message, data = {}) {
  // Validate inputs
  if (!jobId || typeof jobId !== "string") {
    console.warn(`[emitProgress] Invalid jobId: ${jobId}`);
    return false;
  }

  if (!type || typeof type !== "string") {
    console.warn(`[emitProgress] Invalid type for jobId ${jobId}: ${type}`);
    return false;
  }

  const job = jobProgress.get(jobId);
  if (!job) {
    // Log warning but don't fail - job might not have SSE connection yet
    console.log(
      `[emitProgress] No SSE connection found for jobId: ${jobId} (this is normal if SSE hasn't connected yet)`
    );
    return false;
  }

  if (!job.sendProgress) {
    console.warn(
      `[emitProgress] Job exists but sendProgress function missing for jobId: ${jobId}`
    );
    return false;
  }

  try {
    const success = job.sendProgress({
      type,
      message: message || "",
      timestamp: new Date().toISOString(),
      ...data,
    });

    if (!success) {
      console.warn(
        `[emitProgress] Failed to send progress for jobId: ${jobId}, type: ${type}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[emitProgress] Error emitting progress for jobId ${jobId}:`,
      error.message
    );
    return false;
  }
}

module.exports = {
  jobProgress,
  registerJob,
  unregisterJob,
  hasJob,
  getJob,
  emitProgress,
};
