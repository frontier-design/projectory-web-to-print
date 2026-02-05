const SHEET_ID = "1DFnWGA8ptrVgl12Ra9A2R-5WZ0Zeh6NEFZLFE9XGvCg";

function _jsonOutput(data) {
  if (data === undefined) data = {};
  let jsonString;
  try {
    jsonString = JSON.stringify(data);
    if (jsonString === undefined) jsonString = "{}";
  } catch (e) {
    jsonString = JSON.stringify({
      success: false,
      error: "Internal error: Failed to stringify.",
    });
  }
  return ContentService.createTextOutput(jsonString).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  e = e || { parameter: {} };
  const mode = (e.parameter.mode || "").toLowerCase();

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (mode === "answers") {
      // Read all rows from “Answers” (columns B–G) and return as JSON
      const sheet = ss.getSheetByName("Answers");
      if (!sheet) throw new Error("Sheet named 'Answers' not found.");
      const lastRow = sheet.getLastRow();
      const numRows = Math.max(lastRow - 1, 0); // skip header
      if (numRows === 0) return _jsonOutput([]);

      // Columns B–G = getRange(2, 2, numRows, 6)
      const values = sheet.getRange(2, 2, numRows, 6).getValues();
      const output = values.map((row) => ({
        orangeCard: row[0],
        blueCard: row[1],
        whatIsA: row[2],
        thatCould: row[3],
        freeText: row[4],
        email: row[5],
      }));
      return _jsonOutput(output);
    } else {
      // Default: return lookup data from “Lookups” (columns A–B)
      const lookups = ss.getSheetByName("Lookups");
      if (!lookups) throw new Error("Sheet named 'Lookups' not found.");
      const last = lookups.getLastRow();
      const rows = Math.max(last - 1, 0);
      const raw = rows > 0 ? lookups.getRange(2, 1, rows, 2).getValues() : [];
      return _jsonOutput({
        whatIsA: raw.map((r) => r[0]).filter(String),
        thatCould: raw.map((r) => r[1]).filter(String),
      });
    }
  } catch (err) {
    return _jsonOutput({
      success: false,
      error: "Error in doGet: " + err.message,
    });
  }
}

function doPost(e) {
  if (!e) {
    e = { parameter: {}, postData: { contents: "" } };
  }

  // 1) Parse JSON body if present; otherwise fallback to e.parameter
  let payload = {};
  if (e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch {
      payload = e.parameter || {};
    }
  } else {
    payload = e.parameter || {};
  }

  // DEBUG: log raw payload
  console.log(">>> doPost raw payload:", JSON.stringify(payload));

  // 2) Extract exactly these six fields (fallback to empty string if missing)
  const orange = payload.orangeCard || "";
  const blue = payload.blueCard || "";
  const what = payload.whatIsA || "";
  const that = payload.thatCould || "";
  const free = payload.freeText || "";
  const email = payload.email || "";

  // DEBUG: log each extracted field
  console.log(">>> doPost fields:", {
    orangeCard: orange,
    blueCard: blue,
    whatIsA: what,
    thatCould: that,
    freeText: free,
    email: email,
  });

  // 3) Append to “Answers”
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ans = ss.getSheetByName("Answers");
    if (!ans) throw new Error("Sheet named 'Answers' not found.");

    // Ensure the sheet has at least seven columns (A–G) so the email isn't dropped.
    ans.appendRow([new Date(), orange, blue, what, that, free, email]);
    console.log(">>> appendRow succeeded");
    return _jsonOutput({ success: true });
  } catch (err) {
    console.log(">>> appendRow error:", err.message);
    return _jsonOutput({
      success: false,
      error: "Error in doPost: " + err.message,
    });
  }
}
