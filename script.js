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

    // Assemble print-surface
    ps.appendChild(cardsDiv);
    ps.appendChild(answerDiv);

    // Append to print-container
    printContainer.appendChild(ps);
  });
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

  try {
    // Show loading indicator
    const exportBtn = document.getElementById("print-btn");
    const originalText = exportBtn.textContent;
    exportBtn.textContent = "Waking up server...";
    exportBtn.disabled = true;

    // Call server API with retry for cold start
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        exportBtn.textContent = attempts === 0 ? "Waking up server..." : "Generating PDFs...";
        
        response = await fetch(`${config.API_URL}/generate-pdfs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        });

        if (response.ok) {
          break; // Success!
        }
        
        if (response.status === 500 && attempts < maxAttempts - 1) {
          console.log(`Attempt ${attempts + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
          attempts++;
          continue;
        }
        
        throw new Error(`Server error: ${response.status}`);
        
      } catch (fetchError) {
        if (fetchError.message.includes('Failed to fetch') && attempts < maxAttempts - 1) {
          console.log(`Server starting up, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for cold start
          attempts++;
          continue;
        }
        throw fetchError;
      }
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    exportBtn.textContent = "Downloading ZIP...";

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

    exportBtn.textContent = originalText;
    exportBtn.disabled = false;

    alert(
      `Export complete! Downloaded ZIP with ${totalBatches} PDF file(s). 🎉`
    );
  } catch (error) {
    console.error("Export error:", error);
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
