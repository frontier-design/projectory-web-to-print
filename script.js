const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbx6qI9uaV8lQz41DthnTenLx3QBByHUj903YTNd5PIb7KxOoe0zpJMVSX_fVcF9cuOLhA/exec?mode=answers";

function populateAnswersList(answerArray) {
  const list = document.getElementById("answers-list");
  list.innerHTML = "";

  answerArray.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>WhatIsA:</strong> ${item.whatIsA} <br/>
      <strong>ThatCould:</strong> ${item.thatCould} <br/>
      <em>${item.freeText}</em>
    `;
    li.addEventListener("click", () => {
      document.getElementById("orange-overlay").textContent = item.whatIsA;
      document.getElementById("blue-overlay").textContent = item.thatCould;
      const answerBox = document.getElementById("answer");
      answerBox.innerText = item.freeText;
    });
    list.appendChild(li);
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

  document
    .getElementById("print-btn")
    .addEventListener("click", () => window.print());
});
