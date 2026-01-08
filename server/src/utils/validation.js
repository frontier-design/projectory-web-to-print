/**
 * Validation utility functions
 */

/**
 * Validate jobId format
 * @param {string} jobId - The job ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateJobId(jobId) {
  if (!jobId || typeof jobId !== "string") {
    return false;
  }
  // Allow alphanumeric, hyphens, underscores, and dots
  // Must start with letter or number
  const jobIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  return jobIdRegex.test(jobId) && jobId.length <= 100;
}

/**
 * Escape HTML in text content to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  validateJobId,
  escapeHtml,
};
