(async () => {
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbx6qI9uaV8lQz41DthnTenLx3QBByHUj903YTNd5PIb7KxOoe0zpJMVSX_fVcF9cuOLhA/exec?mode=answers";

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
