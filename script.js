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

  answerArray.forEach((item, index) => {
    const rowNumber = index + 1;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="list-item-label">
        <input type="checkbox" class="select-checkbox" />
        <div class="item-content">
          <span class="row-number">${rowNumber}</span>
          <strong class="orangeStrong">What Is A</strong>
          <span class="whatIsA value-text">${item.whatIsA}</span><br/>
          <strong class="blueStrong">That Could</strong>
          <span class="thatCould value-text">${item.thatCould}</span><br/>
          <p>${item.freeText}</p>
        </div>
      </div>
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
    const whatIsA = li
      .querySelector(".item-content .whatIsA")
      .textContent.trim();
    const thatCould = li
      .querySelector(".item-content .thatCould")
      .textContent.trim();
    const freeText = li.querySelector(".item-content p").textContent.trim();

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

  const printBtn = document.getElementById("print-btn");
  const counterSpan = document.createElement("span");
  counterSpan.id = "selected-count";
  counterSpan.textContent = "Selected: 0";
  answersWrapper.appendChild(printBtn);
  answersWrapper.appendChild(counterSpan);

  printBtn.addEventListener("click", () => {
    buildPrintContainer();
    document.getElementById("print-container").style.display = "block";
    window.print();
    document.getElementById("print-container").style.display = "none";
  });
});
