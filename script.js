const WEB_APP_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyBjqgKCilAgqqpy_HkuyrrJ0HaLka-Ch6yea-swOFSKnfRu7dPO7dTc4yLNx2gQ0ZR/exec";

function populateAnswersList(answerArray) {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) {
    clearInterval(Number(spinner.dataset.intervalId));
    spinner.remove();
  }

  const list = document.getElementById("answers-list");

  list.innerHTML = "";

  if (!Array.isArray(answerArray)) {
    list.innerHTML = `<li style="color:red">Error: Expected an array of answers but got ${typeof answerArray}.</li>`;
    console.error("populateAnswersList expected array but got:", answerArray);
    return;
  }

  // Create header row
  const header = document.createElement("li");
  header.className = "list-header";
  header.innerHTML = `
    <span class="header-cell"></span>
    <span class="header-cell"></span>
    <span class="header-cell">What is a</span>
    <span class="header-cell">That Could</span>
    <span class="header-cell">Answer</span>
  `;
  list.appendChild(header);

  // Update total count
  const totalCountSpan = document.getElementById("total-count");
  if (totalCountSpan) {
    totalCountSpan.textContent = `Total: ${answerArray.length}`;
  }

  answerArray.forEach((item, index) => {
    const rowNumber = index + 1;
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="row-number">${rowNumber}</span>
      <input type="checkbox" class="select-checkbox" />
      <span class="whatIsA value-text">${item.whatIsA}</span>
      <span class="thatCould value-text">${item.thatCould}</span>
      <span class="answer-text">${item.freeText}</span>
    `;

    const checkbox = li.querySelector(".select-checkbox");

    checkbox.addEventListener("change", (e) => {
      if (checkbox.checked) {
        li.classList.add("selected");
      } else {
        li.classList.remove("selected");
      }
      e.stopPropagation();
      updateSelectedCount();
    });

    li.addEventListener("click", (e) => {
      if (e.target.closest(".select-checkbox")) return;

      // Update overlays with the current item's text
      document.getElementById("orange-overlay").textContent = item.whatIsA;
      document.getElementById("blue-overlay").textContent = item.thatCould;
      const answerBox = document.getElementById("answer");
      answerBox.innerText = item.freeText;

      checkbox.checked = !checkbox.checked;
      li.classList.toggle("selected", checkbox.checked);
      updateSelectedCount();
    });

    list.appendChild(li);
  });
}

function updateSelectedCount() {
  const selectedCountSpan = document.getElementById("selected-count");
  if (!selectedCountSpan) return;
  const count = document.querySelectorAll("#answers-list li.selected").length;
  selectedCountSpan.textContent = `Selected: ${count}`;
}

function buildPrintContainer(itemsToInclude = null) {
  let printContainer = document.getElementById("print-container");
  if (!printContainer) {
    printContainer = document.createElement("div");
    printContainer.id = "print-container";
    printContainer.style.display = "none";
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = "";

  // Use provided items or get all selected items
  const selectedItems =
    itemsToInclude ||
    Array.from(
      document.querySelectorAll("#answers-list li.selected:not(.list-header)")
    );

  selectedItems.forEach((li) => {
    const whatIsAEl = li.querySelector(".whatIsA");
    const thatCouldEl = li.querySelector(".thatCould");
    const freeTextEl = li.querySelector(".answer-text");

    if (!whatIsAEl || !thatCouldEl || !freeTextEl) {
      console.error("Missing element in selected item:", li);
      return;
    }

    const whatIsA = whatIsAEl.textContent.trim();
    const thatCould = thatCouldEl.textContent.trim();
    const freeText = freeTextEl.textContent.trim();

    const ps = document.createElement("div");
    ps.className = "print-surface";

    const cardsDiv = document.createElement("div");
    cardsDiv.className = "cards";

    // Orange card
    const orangeCard = document.createElement("div");
    orangeCard.id = "orange-card";
    orangeCard.className = "card";
    const orangeOverlay = document.createElement("div");
    orangeOverlay.className = "overlay-text";
    orangeOverlay.textContent = whatIsA;
    orangeCard.appendChild(orangeOverlay);

    // Blue card
    const blueCard = document.createElement("div");
    blueCard.id = "blue-card";
    blueCard.className = "card";
    const blueOverlay = document.createElement("div");
    blueOverlay.className = "overlay-text";
    blueOverlay.textContent = thatCould;
    blueCard.appendChild(blueOverlay);

    cardsDiv.appendChild(orangeCard);
    cardsDiv.appendChild(blueCard);

    // Answer box
    const answerDiv = document.createElement("div");
    answerDiv.className = "answer";
    const answerBox = document.createElement("div");
    answerBox.className = "answer-box";
    answerBox.textContent = freeText;
    answerDiv.appendChild(answerBox);

    // AI image container (for preview - shows where image will appear)
    const aiImageContainer = document.createElement("div");
    aiImageContainer.className = "ai-image-container";
    // Add placeholder text to show it's for AI images
    const placeholder = document.createElement("div");
    placeholder.style.cssText =
      "color: teal; font-size: 0.9rem; text-align: center; opacity: 0.6;";
    placeholder.textContent = "AI Image";
    aiImageContainer.appendChild(placeholder);

    // Assemble print-surface
    ps.appendChild(cardsDiv);
    ps.appendChild(answerDiv);
    ps.appendChild(aiImageContainer);

    // Append to print-container
    printContainer.appendChild(ps);
  });
}

/**
 * Wake up the server with health check requests
 * Handles Render.com cold starts by retrying with exponential backoff
 * @param {string} apiUrl - The base API URL
 * @param {function} addLogEntry - Function to add log entries to the UI
 * @param {number} maxAttempts - Maximum number of attempts (default: 6)
 * @returns {Promise<boolean>} - True if server is ready, false otherwise
 */
async function wakeUpServer(apiUrl, addLogEntry, maxAttempts = 6) {
  // Attempts with exponential backoff: ~75s total max wait
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      addLogEntry(
        attempt === 0
          ? "Waking up server..."
          : `Server starting up... (attempt ${attempt + 1}/${maxAttempts})`,
        "info"
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per attempt

      const response = await fetch(`${apiUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        addLogEntry("Server is ready!", "success");
        return true;
      }
    } catch (error) {
      console.log(`[WakeUp] Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxAttempts - 1) {
        // Wait before retry (exponential backoff: 5s, 10s, 15s...)
        const waitTime = 5000 * (attempt + 1);
        addLogEntry(`Waiting ${waitTime / 1000}s before retry...`, "info");
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
  }
  return false;
}

/**
 * Export selected items as batched PDFs via server (35 items per PDF)
 * Server generates PDFs with Puppeteer and returns as ZIP
 */
async function exportBatchedPDFs() {
  const selectedItems = Array.from(
    document.querySelectorAll("#answers-list li.selected:not(.list-header)")
  );

  if (selectedItems.length === 0) {
    alert("No items selected for export");
    return;
  }

  const totalBatches = Math.ceil(selectedItems.length / 35);

  const confirmMsg = `This will automatically generate and download ${totalBatches} PDF file(s) in a ZIP:\n\n${
    totalBatches === 1
      ? "comboconvo-1.pdf"
      : `comboconvo-1.pdf through comboconvo-${totalBatches}.pdf`
  }\n\nClick OK to start.`;

  if (!confirm(confirmMsg)) {
    return;
  }

  // Extract item data
  const items = selectedItems.map((li) => {
    const whatIsAEl = li.querySelector(".whatIsA");
    const thatCouldEl = li.querySelector(".thatCould");
    const freeTextEl = li.querySelector(".answer-text");

    return {
      whatIsA: whatIsAEl ? whatIsAEl.textContent.trim() : "",
      thatCould: thatCouldEl ? thatCouldEl.textContent.trim() : "",
      freeText: freeTextEl ? freeTextEl.textContent.trim() : "",
    };
  });

  // Show loading indicator and status panel
  const exportBtn = document.getElementById("print-btn");
  const originalText = exportBtn.textContent;
  exportBtn.textContent = "Waking up server...";
  exportBtn.disabled = true;

  // Show status panel
  const statusPanel = document.getElementById("status-panel");
  const statusLog = document.getElementById("status-log");
  statusPanel.classList.remove("hidden");
  statusLog.innerHTML = "";

  // Function to add log entry (defined outside try block so catch can use it)
  const addLogEntry = (message, type = "info") => {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${timestamp}</span> <span class="log-message">${message}</span>`;
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight; // Auto-scroll to bottom
  };

  try {
    // Helper function to validate jobId format
    const validateJobId = (id) => {
      if (!id || typeof id !== "string") return false;
      const jobIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
      return jobIdRegex.test(id) && id.length <= 100;
    };

    // Generate job ID (safe format: alphanumeric with hyphens)
    const generateJobId = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      return `job-${timestamp}-${random}`;
    };

    const jobId = generateJobId();

    // Validate generated jobId
    if (!validateJobId(jobId)) {
      console.error("Generated invalid jobId:", jobId);
      alert("Error: Failed to generate valid job ID. Please try again.");
      exportBtn.textContent = originalText;
      exportBtn.disabled = false;
      return;
    }

    // SSE connection state management
    let eventSource = null;
    let sseConnected = false;
    let sseConnectionTimeout = null;
    let sseRetryCount = 0;
    const maxSSERetries = 3;
    const sseConnectionTimeoutMs = 15000; // 15 seconds to establish connection (increased for cold starts)

    // Function to establish SSE connection with retry logic
    const connectSSE = () => {
      return new Promise((resolve, reject) => {
        if (eventSource) {
          eventSource.close();
        }

        addLogEntry("Connecting to server for status updates...", "info");
        console.log(
          `[SSE] Attempting to connect to: ${config.API_URL}/status/${jobId}`
        );

        eventSource = new EventSource(`${config.API_URL}/status/${jobId}`);

        // Connection timeout
        sseConnectionTimeout = setTimeout(() => {
          if (!sseConnected) {
            console.warn(
              `[SSE] Connection timeout after ${sseConnectionTimeoutMs}ms`
            );
            eventSource.close();
            eventSource = null;
            reject(new Error("SSE connection timeout"));
          }
        }, sseConnectionTimeoutMs);

        // Handle successful connection
        eventSource.onopen = () => {
          console.log("[SSE] Connection opened");
          // Note: We'll wait for the "connected" message to confirm
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

            // Handle other message types
            switch (data.type) {
              case "start":
                addLogEntry(
                  `Starting: ${data.message} (${data.totalItems} items)`,
                  "info"
                );
                exportBtn.textContent = "Generating PDFs...";
                break;
              case "progress":
                addLogEntry(data.message, "info");
                break;
              case "batch-start":
                addLogEntry(
                  `📦 Batch ${data.batchNumber}/${data.totalBatches}: ${data.itemsInBatch} items`,
                  "info"
                );
                break;
              case "image-gen":
                addLogEntry(`🎨 ${data.message}`, "info");
                break;
              case "image-progress":
                addLogEntry(
                  `🎨 Generating image ${data.current}/${data.total}...`,
                  "info"
                );
                break;
              case "image-complete":
                addLogEntry(`✅ ${data.message}`, "success");
                break;
              case "batch-complete":
                addLogEntry(
                  `✅ Batch ${data.batchNumber}/${data.totalBatches} complete!`,
                  "success"
                );
                break;
              case "complete":
                addLogEntry(`🎉 ${data.message}`, "success");
                addLogEntry("Downloading ZIP file...", "info");
                if (eventSource) {
                  eventSource.close();
                  eventSource = null;
                }
                break;
              case "warning":
                addLogEntry(`⚠️ ${data.message}`, "warning");
                break;
              case "error":
                addLogEntry(`❌ ${data.message}`, "error");
                if (eventSource) {
                  eventSource.close();
                  eventSource = null;
                }
                break;
              case "test":
                // Ignore test messages
                break;
            }
          } catch (e) {
            console.error("[SSE] Error parsing SSE data:", e);
            addLogEntry("⚠️ Error parsing server message", "warning");
          }
        };

        // Handle errors
        eventSource.onerror = (error) => {
          console.error("[SSE] Connection error:", error);
          console.error(
            "[SSE] EventSource readyState:",
            eventSource?.readyState
          );

          // EventSource.readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
          if (eventSource?.readyState === EventSource.CLOSED) {
            if (!sseConnected) {
              // Connection failed before establishing
              if (sseConnectionTimeout) {
                clearTimeout(sseConnectionTimeout);
                sseConnectionTimeout = null;
              }

              if (sseRetryCount < maxSSERetries) {
                sseRetryCount++;
                addLogEntry(
                  `⚠️ Connection failed, retrying... (${sseRetryCount}/${maxSSERetries})`,
                  "warning"
                );
                console.log(
                  `[SSE] Retrying connection (attempt ${sseRetryCount})`
                );
                setTimeout(() => {
                  connectSSE().then(resolve).catch(reject);
                }, 1000 * sseRetryCount); // Exponential backoff
              } else {
                addLogEntry(
                  "⚠️ Could not establish status connection. Continuing without live updates...",
                  "warning"
                );
                console.warn(
                  "[SSE] Max retries reached, continuing without SSE"
                );
                eventSource = null;
                resolve(null); // Resolve with null to continue anyway
              }
            } else {
              // Connection was established but then closed
              addLogEntry("⚠️ Status connection lost", "warning");
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
            }
          } else if (eventSource?.readyState === EventSource.CONNECTING) {
            // Still connecting, wait a bit more
            console.log("[SSE] Still connecting...");
          }
        };
      });
    };

    // Step 1: Wake up the server first with health check
    exportBtn.textContent = "Waking up server...";
    const serverReady = await wakeUpServer(config.API_URL, addLogEntry);

    if (!serverReady) {
      addLogEntry("Server did not respond. Please try again later.", "error");
      exportBtn.textContent = originalText;
      exportBtn.disabled = false;
      return;
    }

    // Step 2: Now connect SSE (server is awake!)
    exportBtn.textContent = "Connecting...";
    let sseConnectionEstablished = false;
    try {
      await connectSSE();
      sseConnectionEstablished = true;
    } catch (error) {
      console.warn("[SSE] Failed to establish connection:", error);
      addLogEntry(
        "⚠️ Status updates unavailable. PDF generation will continue...",
        "warning"
      );
      // Continue anyway - PDF generation will work without SSE
    }

    // Step 3: Call server API to generate PDFs (server is already awake)
    exportBtn.textContent = "Generating PDFs...";
    let response;

    try {
      addLogEntry("Starting PDF generation...", "info");

      response = await fetch(`${config.API_URL}/generate-pdfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items, jobId }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (fetchError) {
      console.error("[PDF] Error generating PDFs:", fetchError);
      addLogEntry(`Error: ${fetchError.message}`, "error");
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      throw fetchError;
    }

    // Download ZIP
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comboconvo-pdfs.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLogEntry("✅ Download complete!", "success");
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;

    // Clean up SSE connection if still open
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  } catch (error) {
    console.error("Export error:", error);
    addLogEntry(`❌ Export failed: ${error.message}`, "error");

    // Clean up SSE connection on error (check if defined)
    try {
      if (typeof eventSource !== "undefined" && eventSource) {
        eventSource.close();
        eventSource = null;
      }
    } catch (e) {
      // Ignore cleanup errors
      console.warn("Could not clean up SSE connection:", e);
    }

    alert(
      `Export failed: ${error.message}\n\nMake sure the server is running:\n1. Open terminal\n2. cd server\n3. npm start`
    );

    const exportBtn = document.getElementById("print-btn");
    exportBtn.textContent = "Export";
    exportBtn.disabled = false;
  }
}

/**
 * Fetch all answers live from the Google Apps Script, telling it `?mode=answers`.
 * On success, pass the JSON array to populateAnswersList.
 * On failure, show an error in the #answers-list <ul>.
 */
async function fetchAllAnswers() {
  try {
    // Always append ?mode=answers so the script returns an array, never an object
    const fetchURL = `${WEB_APP_BASE_URL}?mode=answers`;
    const response = await fetch(fetchURL);
    if (!response.ok) {
      throw new Error(`Lookup request failed with status ${response.status}`);
    }
    const data = await response.json();
    populateAnswersList(data);
  } catch (err) {
    console.error("Error fetching answers:", err);
    const list = document.getElementById("answers-list");
    list.innerHTML = `<li style="color:red">Failed to load answers. Check console.</li>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const answersList = document.getElementById("answers-list");
  const answersWrapper = document.createElement("div");
  answersWrapper.id = "answers-wrapper";
  answersList.parentNode.insertBefore(answersWrapper, answersList);
  answersWrapper.appendChild(answersList);

  ["orange", "blue"].forEach((color) => {
    const card = document.getElementById(`${color}-card`);
    const overlay = document.createElement("div");
    overlay.id = `${color}-overlay`;
    overlay.className = "overlay-text";
    card.appendChild(overlay);
  });

  const spinner = document.createElement("div");
  spinner.id = "loading-spinner";
  spinner.textContent = "Loading";
  document.body.appendChild(spinner);
  let dotCount = 0;
  const loadingInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    spinner.textContent = "Loading" + ".".repeat(dotCount);
  }, 500);
  spinner.dataset.intervalId = loadingInterval;

  fetchAllAnswers();

  // Create control panel container
  const controlPanel = document.createElement("div");
  controlPanel.id = "control-panel";
  document.body.appendChild(controlPanel);

  // Create Select All button
  const selectAllBtn = document.createElement("button");
  selectAllBtn.id = "select-all-btn";
  selectAllBtn.textContent = "Select All";
  controlPanel.appendChild(selectAllBtn);

  // Create counts container
  const countsContainer = document.createElement("div");
  countsContainer.className = "counts-container";
  controlPanel.appendChild(countsContainer);

  // Create total count span
  const totalSpan = document.createElement("span");
  totalSpan.id = "total-count";
  totalSpan.textContent = "Total: 0";
  countsContainer.appendChild(totalSpan);

  // Create counter span
  const counterSpan = document.createElement("span");
  counterSpan.id = "selected-count";
  counterSpan.textContent = "Selected: 0";
  countsContainer.appendChild(counterSpan);

  // Create status panel inside control panel
  const statusPanel = document.createElement("div");
  statusPanel.id = "status-panel";
  statusPanel.className = "status-panel hidden";
  const statusHeader = document.createElement("div");
  statusHeader.className = "status-header";
  statusHeader.innerHTML = "<h3>Generation Status</h3>";
  statusPanel.appendChild(statusHeader);
  const statusLog = document.createElement("div");
  statusLog.id = "status-log";
  statusLog.className = "status-log";
  statusPanel.appendChild(statusLog);
  controlPanel.appendChild(statusPanel);

  // Move print button to control panel (will be at bottom due to margin-top: auto)
  const printBtn = document.getElementById("print-btn");
  controlPanel.appendChild(printBtn);

  let allSelected = false;
  selectAllBtn.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".select-checkbox");
    const listItems = document.querySelectorAll("#answers-list li");

    allSelected = !allSelected;

    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = allSelected;
      listItems[index].classList.toggle("selected", allSelected);
    });

    selectAllBtn.textContent = allSelected ? "Deselect All" : "Select All";
    updateSelectedCount();
  });

  printBtn.addEventListener("click", async () => {
    await exportBatchedPDFs();
  });
});
