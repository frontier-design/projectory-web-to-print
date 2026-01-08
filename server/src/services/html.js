/**
 * HTML Generation Service
 *
 * Generates HTML for PDF rendering with proper styling
 * and embedded assets.
 */

const { escapeHtml } = require("../utils/validation");

/**
 * Generate HTML for a batch of items
 * @param {Array} items - Items with structure: { whatIsA, thatCould, freeText, aiImage? }
 * @param {string} cssContent - CSS content with embedded fonts
 * @param {string} orangeSvg - Base64 encoded orange SVG
 * @param {string} blueSvg - Base64 encoded blue SVG
 * @returns {string} - Complete HTML document
 */
function generateHTML(items, cssContent, orangeSvg, blueSvg) {
  const printSurfaces = items
    .map((item) => {
      const whatIsA = escapeHtml(item.whatIsA);
      const thatCould = escapeHtml(item.thatCould);
      const freeText = escapeHtml(item.freeText);
      const aiImage = item.aiImage || null;

      // Include AI image if available
      const aiImageHtml = aiImage
        ? `<div class="ai-image-container">
               <img src="${aiImage}" alt="AI Generated Image" class="ai-image" />
             </div>`
        : "";

      return `
    <div class="print-surface">
      <div class="cards">
        <div class="card orange-card">
          <div class="overlay-text">${whatIsA}</div>
        </div>
        <div class="card blue-card">
          <div class="overlay-text">${thatCould}</div>
        </div>
      </div>
      <div class="answer">
        <div class="answer-box">${freeText}</div>
      </div>
      ${aiImageHtml}
    </div>
  `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${cssContent}
    
    /* Override for server-side rendering - use classes for multiple instances */
    .orange-card {
      background-image: url('data:image/svg+xml;base64,${orangeSvg}');
    }
    .blue-card {
      background-image: url('data:image/svg+xml;base64,${blueSvg}');
    }
    
    /* Ensure card has relative positioning for absolute overlay */
    .card {
      position: relative !important;
    }
    
    /* Ensure overlay text is properly positioned and visible */
    .overlay-text {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      text-align: center !important;
      width: 75% !important;
      font-size: 2.2rem !important;
      font-family: 'FounderGrotesk_Medium', sans-serif !important;
      color: #fff !important;
      z-index: 10 !important;
      border: none !important;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="print-container">
    ${printSurfaces}
  </div>
</body>
</html>
  `;
}

module.exports = {
  generateHTML,
};
