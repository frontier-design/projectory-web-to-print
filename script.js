// Reminder: Ensure your HTML includes a hidden container for printing:
// <div id="print-container" style="display:none;"></div>

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyZUYi2C60jwxA1sb2T7lUbvXe1WQDiyg_fHFNfse4CGDSGcdFYBZBb6q7T36ERR-dN/exec?mode=answers";

function populateAnswersList(answerArray) {
  const list = document.getElementById("answers-list");
  list.innerHTML = "";

  answerArray.forEach((item, index) => {
    const rowNumber = index + 1; // Compute row number (1-based)
    const li = document.createElement("li");

    // Insert a checkbox, the row number, and the rest of the content
    li.innerHTML = `
      <label class="list-item-label" style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" class="select-checkbox" />
        <span class="row-number">${rowNumber}.</span>
        <div class="item-content">
          <strong class="orangeStrong">WhatIsA:</strong> ${item.whatIsA} <br/>
          <strong class="blueStrong">ThatCould:</strong> ${item.thatCould} <br/>
          <p>${item.freeText}</p>
        </div>
      </label>
    `;

    // Reference the checkbox inside this list item
    const checkbox = li.querySelector(".select-checkbox");

    // When checkbox changes, update selection and counter
    checkbox.addEventListener("change", (e) => {
      if (checkbox.checked) {
        li.classList.add("selected");
      } else {
        li.classList.remove("selected");
      }
      e.stopPropagation();
      updateSelectedCount();
    });

    // Handle click on the <li>
    li.addEventListener("click", (e) => {
      // 1) If the click is on the checkbox itself, let the checkbox handler run
      if (e.target.closest(".select-checkbox")) {
        return;
      }
      // 2) If the click is inside the item-content, only update overlays
      if (e.target.closest(".item-content")) {
        document.getElementById("orange-overlay").textContent = item.whatIsA;
        document.getElementById("blue-overlay").textContent = item.thatCould;
        const answerBox = document.getElementById("answer");
        answerBox.innerText = item.freeText;
        return;
      }
      // 3) Otherwise (click on row-number or whitespace), toggle selection
      checkbox.checked = !checkbox.checked;
      li.classList.toggle("selected", checkbox.checked);
      updateSelectedCount();
    });

    list.appendChild(li);
  });
}

// Update the displayed count of selected items
function updateSelectedCount() {
  const selectedCountSpan = document.getElementById("selected-count");
  if (!selectedCountSpan) return;
  const count = document.querySelectorAll("#answers-list li.selected").length;
  selectedCountSpan.textContent = `Selected: ${count}`;
}

// Build a print-only container with one print-surface per selected item
function buildPrintContainer() {
  // Remove any existing print-container content
  let printContainer = document.getElementById("print-container");
  if (!printContainer) {
    // If the container isn't in the HTML, create and append it
    printContainer = document.createElement("div");
    printContainer.id = "print-container";
    printContainer.style.display = "none";
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = "";

  // For each selected <li>, clone its data into a new print-surface
  const selectedItems = document.querySelectorAll("#answers-list li.selected");
  selectedItems.forEach((li) => {
    const whatIsA = li
      .querySelector(".item-content .orangeStrong")
      .nextSibling.textContent.trim();
    const thatCould = li
      .querySelector(".item-content .blueStrong")
      .nextSibling.textContent.trim();
    const freeText = li.querySelector(".item-content p").textContent.trim();

    // Create a new print-surface wrapper
    const ps = document.createElement("div");
    ps.className = "print-surface";

    // Create cards container
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

async function fetchAllAnswers() {
  try {
    const response = await fetch(WEB_APP_URL);
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
  fetchAllAnswers();

  const printBtn = document.getElementById("print-btn");
  const counterSpan = document.createElement("span");
  counterSpan.id = "selected-count";
  counterSpan.textContent = "Selected: 0";
  printBtn.insertAdjacentElement("afterend", counterSpan);

  document.getElementById("print-btn").addEventListener("click", () => {
    buildPrintContainer();
    // Temporarily show the print container and hide the rest via CSS
    document.getElementById("print-container").style.display = "block";
    window.print();
    // After printing, hide it again
    document.getElementById("print-container").style.display = "none";
  });
});
