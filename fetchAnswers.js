(async () => {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyZUYi2C60jwxA1sb2T7lUbvXe1WQDiyg_fHFNfse4CGDSGcdFYBZBb6q7T36ERR-dN/exec?mode=answers";

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
