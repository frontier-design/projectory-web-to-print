(async () => {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyBjqgKCilAgqqpy_HkuyrrJ0HaLka-Ch6yea-swOFSKnfRu7dPO7dTc4yLNx2gQ0ZR/exec?mode=answers";

  try {
    const res = await fetch(WEB_APP_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    }
    const data = await res.json();
    console.log("Fetched Answers data:");
    console.dir(data, { depth: null, colors: true });
  } catch (err) {
    console.error("Error fetching answers:", err);
  }
})();
