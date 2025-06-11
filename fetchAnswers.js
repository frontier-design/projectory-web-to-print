(async () => {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbw3jszT16xnqHvT1OwYswb1hhzDcyzsc53vkCq-JdwCEmQG5VKY5W65c-mkm65LVIFG1A/exec?mode=answers";

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
