/**
 * SSE Connection Module
 *
 * Handles Server-Sent Events connection for real-time
 * progress updates during PDF generation.
 */

// SSE namespace
window.SSEConnection = (function () {
  let eventSource = null;
  let sseConnected = false;
  let sseConnectionTimeout = null;
  let sseRetryCount = 0;

  // Configuration
  const MAX_RETRIES = 3;
  const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds (increased for cold starts)

  /**
   * Validate jobId format
   * @param {string} id - The job ID to validate
   * @returns {boolean}
   */
  function validateJobId(id) {
    if (!id || typeof id !== "string") return false;
    const jobIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    return jobIdRegex.test(id) && id.length <= 100;
  }

  /**
   * Generate a unique job ID
   * @returns {string}
   */
  function generateJobId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `job-${timestamp}-${random}`;
  }

  /**
   * Connect to the SSE endpoint
   * @param {string} apiUrl - The base API URL
   * @param {string} jobId - The job ID
   * @param {function} onMessage - Callback for handling messages
   * @param {function} addLogEntry - Function to add log entries to the UI
   * @returns {Promise<EventSource|null>}
   */
  function connect(apiUrl, jobId, onMessage, addLogEntry) {
    return new Promise((resolve, reject) => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Reset state
      sseConnected = false;
      sseConnectionTimeout = null;

      addLogEntry("Connecting to server for status updates...", "info");
      console.log(`[SSE] Attempting to connect to: ${apiUrl}/status/${jobId}`);

      eventSource = new EventSource(`${apiUrl}/status/${jobId}`);

      // Connection timeout
      sseConnectionTimeout = setTimeout(() => {
        if (!sseConnected) {
          console.warn(
            `[SSE] Connection timeout after ${CONNECTION_TIMEOUT_MS}ms`
          );
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reject(new Error("SSE connection timeout"));
        }
      }, CONNECTION_TIMEOUT_MS);

      // Handle successful connection
      eventSource.onopen = () => {
        console.log("[SSE] Connection opened");
      };

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle initial connection confirmation
          if (data.type === "connected") {
            if (!sseConnected) {
              sseConnected = true;
              if (sseConnectionTimeout) {
                clearTimeout(sseConnectionTimeout);
                sseConnectionTimeout = null;
              }
              addLogEntry("✅ Connected to server", "success");
              console.log("[SSE] Connection confirmed");
              resolve(eventSource);
            }
            return;
          }

          // Pass to message handler
          if (onMessage) {
            onMessage(data);
          }
        } catch (e) {
          console.error("[SSE] Error parsing SSE data:", e);
          addLogEntry("⚠️ Error parsing server message", "warning");
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        console.error("[SSE] EventSource readyState:", eventSource?.readyState);

        if (eventSource?.readyState === EventSource.CLOSED) {
          if (!sseConnected) {
            // Connection failed before establishing
            if (sseConnectionTimeout) {
              clearTimeout(sseConnectionTimeout);
              sseConnectionTimeout = null;
            }

            if (sseRetryCount < MAX_RETRIES) {
              sseRetryCount++;
              addLogEntry(
                `⚠️ Connection failed, retrying... (${sseRetryCount}/${MAX_RETRIES})`,
                "warning"
              );
              console.log(
                `[SSE] Retrying connection (attempt ${sseRetryCount})`
              );
              setTimeout(() => {
                connect(apiUrl, jobId, onMessage, addLogEntry)
                  .then(resolve)
                  .catch(reject);
              }, 1000 * sseRetryCount); // Exponential backoff
            } else {
              addLogEntry(
                "⚠️ Could not establish status connection. Continuing without live updates...",
                "warning"
              );
              console.warn("[SSE] Max retries reached, continuing without SSE");
              eventSource = null;
              resolve(null); // Resolve with null to continue anyway
            }
          } else {
            // Connection was established but then closed
            addLogEntry("⚠️ Status connection lost", "warning");
            close();
          }
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          console.log("[SSE] Still connecting...");
        }
      };
    });
  }

  /**
   * Close the SSE connection
   */
  function close() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    sseConnected = false;
    sseRetryCount = 0;
    if (sseConnectionTimeout) {
      clearTimeout(sseConnectionTimeout);
      sseConnectionTimeout = null;
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  function isConnected() {
    return sseConnected && eventSource !== null;
  }

  /**
   * Reset retry counter
   */
  function resetRetryCount() {
    sseRetryCount = 0;
  }

  // Public API
  return {
    validateJobId,
    generateJobId,
    connect,
    close,
    isConnected,
    resetRetryCount,
  };
})();
