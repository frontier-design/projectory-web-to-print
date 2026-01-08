/**
 * Status Panel Module
 * 
 * Manages the status panel UI in the control panel.
 * Provides functions to create, show, hide, and update the panel.
 */

// Status panel namespace
window.StatusPanel = (function() {
  let statusPanel = null;
  let statusLog = null;

  /**
   * Create the status panel in the control panel
   * @param {HTMLElement} controlPanel - The control panel element
   */
  function create(controlPanel) {
    if (statusPanel) {
      return statusPanel;
    }

    statusPanel = document.createElement("div");
    statusPanel.id = "status-panel";
    statusPanel.className = "status-panel hidden";

    const statusHeader = document.createElement("div");
    statusHeader.className = "status-header";
    statusHeader.innerHTML = "<h3>Generation Status</h3>";
    statusPanel.appendChild(statusHeader);

    statusLog = document.createElement("div");
    statusLog.id = "status-log";
    statusLog.className = "status-log";
    statusPanel.appendChild(statusLog);

    controlPanel.appendChild(statusPanel);

    return statusPanel;
  }

  /**
   * Show the status panel
   */
  function show() {
    if (statusPanel) {
      statusPanel.classList.remove("hidden");
    }
  }

  /**
   * Hide the status panel
   */
  function hide() {
    if (statusPanel) {
      statusPanel.classList.add("hidden");
    }
  }

  /**
   * Clear all log entries
   */
  function clear() {
    if (statusLog) {
      statusLog.innerHTML = "";
    }
  }

  /**
   * Add a log entry to the status panel
   * @param {string} message - The message to display
   * @param {string} type - The type of message: "info", "success", "warning", "error"
   */
  function addLogEntry(message, type = "info") {
    if (!statusLog) {
      console.warn("[StatusPanel] Status log not initialized");
      return;
    }

    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${timestamp}</span> <span class="log-message">${message}</span>`;
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight; // Auto-scroll to bottom
  }

  /**
   * Get the status panel element
   * @returns {HTMLElement|null}
   */
  function getPanel() {
    return statusPanel;
  }

  /**
   * Get the status log element
   * @returns {HTMLElement|null}
   */
  function getLog() {
    return statusLog;
  }

  // Public API
  return {
    create,
    show,
    hide,
    clear,
    addLogEntry,
    getPanel,
    getLog,
  };
})();
