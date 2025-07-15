// FetchAllAnswers.gs

// (SHEET_ID is already declared in your Code.gs, so we don't re-declare it here.)

/**
 * Helper: wrap any JS value into JSON TextOutput.
 */
function _jsonOutput(data) {
  if (data === undefined) data = {};
  let jsonString;
  try {
    jsonString = JSON.stringify(data);
    if (jsonString === undefined) jsonString = '{}';
  } catch (e) {
    jsonString = JSON.stringify({
      success: false,
      error: 'Internal error: Failed to stringify in _jsonOutput.'
    });
  }
  return ContentService
    .createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doGet(e):
 *   • If e.parameter.mode === 'answers', return all rows from “Answers” sheet (columns B–F).
 *   • Otherwise (or if mode is missing), return lookups from “Lookups” sheet (columns A–B).
 *
 * We guard against e being undefined by setting it to { parameter: {} } if needed.
 */
function doGet(e) {
  // Ensure e.parameter is always defined
  e = e || { parameter: {} };
  const mode = e.parameter.mode ? String(e.parameter.mode).toLowerCase() : 'lookups';

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (mode === 'answers') {
      // ── Return all rows from "Answers" sheet (columns B–F) ──
      const answers = ss.getSheetByName('Answers');
      if (!answers) {
        throw new Error("Sheet named 'Answers' not found.");
      }

      const lastRow = answers.getLastRow();
      const numRows = Math.max(lastRow - 1, 0); // skip header
      if (numRows === 0) {
        return _jsonOutput([]); // no submissions → empty array
      }

      // Read range: row 2..lastRow, columns 2→6 (B–F)
      const values = answers.getRange(2, 2, numRows, 5).getValues();
      const output = values.map(row => ({
        orangeCard: row[0],
        blueCard:   row[1],
        whatIsA:    row[2],
        thatCould:  row[3],
        freeText:   row[4]
      }));

      return _jsonOutput(output);

    } else {
      // ── Default: return lookups from "Lookups" sheet (columns A–B) ──
      const lookups = ss.getSheetByName('Lookups');
      if (!lookups) {
        throw new Error("Sheet named 'Lookups' not found.");
      }

      const lastRow = lookups.getLastRow();
      const numRows = Math.max(lastRow - 1, 0);
      const raw = (numRows > 0)
        ? lookups.getRange(2, 1, numRows, 2).getValues()
        : [];

      const whatIsA   = raw.map(r => r[0]).filter(String);
      const thatCould = raw.map(r => r[1]).filter(String);

      return _jsonOutput({ whatIsA, thatCould });
    }

  } catch (err) {
    return _jsonOutput({
      success: false,
      error: "Error in doGet: " + err.message
    });
  }
}