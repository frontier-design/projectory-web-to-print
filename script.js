// script.js

// Replace this with your actual deployed Web App URL (without any query string)
const WEB_APP_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyZUYi2C60jwxA1sb2T7lUbvXe1WQDiyg_fHFNfse4CGDSGcdFYBZBb6q7T36ERR-dN/exec";

/**
 * Populate the #answers-list <ul> with one <li> per answer object.
 * Each answer object is expected to have: { orangeCard, blueCard, whatIsA, thatCould, freeText }.
 */
function populateAnswersList(answerArray) {
  const list = document.getElementById("answers-list");
  list.innerHTML = "";

  // If answerArray is not actually an Array, bail with an error message
  if (!Array.isArray(answerArray)) {
    list.innerHTML = `<li style="color:red">Error: Expected an array of answers but got ${typeof answerArray}.</li>`;
    console.error("populateAnswersList expected array but got:", answerArray);
    return;
  }

  answerArray.forEach((item, index) => {
    const rowNumber = index + 1; // 1-based

    // Create <li> and its inner structure
    const li = document.createElement("li");
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

    // Reference the checkbox inside this <li>
    const checkbox = li.querySelector(".select-checkbox");

    // When the checkbox changes, update the 'selected' class and the counter
    checkbox.addEventListener("change", (e) => {
      if (checkbox.checked) {
        li.classList.add("selected");
      } else {
        li.classList.remove("selected");
      }
      e.stopPropagation();
      updateSelectedCount();
    });

    // Click on the <li> itself:
    li.addEventListener("click", (e) => {
      // 1) If click was on the checkbox itself, let the checkbox handler run
      if (e.target.closest(".select-checkbox")) {
        return;
      }
      // 2) If click was inside the .item-content, only update overlays
      if (e.target.closest(".item-content")) {
        document.getElementById("orange-overlay").textContent = item.whatIsA;
        document.getElementById("blue-overlay").textContent = item.thatCould;
        const answerBox = document.getElementById("answer");
        answerBox.innerText = item.freeText;
        return;
      }
      // 3) Otherwise (click on row number or whitespace), toggle selection
      checkbox.checked = !checkbox.checked;
      li.classList.toggle("selected", checkbox.checked);
      updateSelectedCount();
    });

    // Append <li> to the list
    list.appendChild(li);
  });
}

/**
 * Update the displayed count of how many items are currently selected.
 * Expects a <span id="selected-count"> in the DOM.
 */
function updateSelectedCount() {
  const selectedCountSpan = document.getElementById("selected-count");
  if (!selectedCountSpan) return;
  const count = document.querySelectorAll("#answers-list li.selected").length;
  selectedCountSpan.textContent = `Selected: ${count}`;
}

/**
 * Build a hidden print-container that holds one .print-surface per selected <li>.
 * These clones will be the only visible .print-surface elements when printing.
 */
function buildPrintContainer() {
  let printContainer = document.getElementById("print-container");
  if (!printContainer) {
    printContainer = document.createElement("div");
    printContainer.id = "print-container";
    printContainer.style.display = "none";
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = "";

  const selectedItems = document.querySelectorAll("#answers-list li.selected");
  selectedItems.forEach((li) => {
    // Extract values from the clicked list item
    const whatIsA = li
      .querySelector(".item-content .orangeStrong")
      .nextSibling.textContent.trim();
    const thatCould = li
      .querySelector(".item-content .blueStrong")
      .nextSibling.textContent.trim();
    const freeText = li.querySelector(".item-content p").textContent.trim();

    // Create a new .print-surface wrapper
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

/**
 * When the DOM is ready:
 *  • Call fetchAllAnswers() to load current data.
 *  • Insert a <span id="selected-count"> next to the “Export” button.
 *  • Wire up the “Export” button to buildPrintContainer and print.
 */
document.addEventListener("DOMContentLoaded", () => {
  fetchAllAnswers();

  // Add Selected: 0 <span> after the print button
  const printBtn = document.getElementById("print-btn");
  const counterSpan = document.createElement("span");
  counterSpan.id = "selected-count";
  counterSpan.textContent = "Selected: 0";
  printBtn.insertAdjacentElement("afterend", counterSpan);

  // Click handler for the Export button
  document.getElementById("print-btn").addEventListener("click", () => {
    buildPrintContainer();
    document.getElementById("print-container").style.display = "block";
    window.print();
    document.getElementById("print-container").style.display = "none";
  });
});
