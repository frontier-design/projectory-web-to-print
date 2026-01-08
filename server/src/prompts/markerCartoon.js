/**
 * AI Prompt Builder for Marker Cartoon Style
 *
 * This module contains prompt templates for generating
 * marker-style cartoon illustrations using AI.
 */

/**
 * Build marker cartoon prompt with detailed style instructions
 * @param {string} subject - The subject to draw
 * @param {object} options - Prompt options
 * @param {string} options.framing - Framing type (default: "full-body")
 * @param {string} options.view - View angle (default: "front view")
 * @param {string} options.shading - Shading style (default: "none")
 * @param {string} options.mood - Mood description (default: "playful and friendly")
 * @returns {string} Formatted prompt
 */
function buildMarkerCartoonPrompt(subject, options = {}) {
  const {
    framing = "full-body",
    view = "front view",
    shading = "none",
    mood = "playful and friendly",
    aspectRatio = "2:3 portrait",
  } = options;

  return `
${subject.trim()}, shown clearly and centered.

Style: clean black felt-tip marker line art, simple comic/cartoon illustration.
Linework: thick smooth outer contour, thinner inner details, consistent stroke thickness, crisp clean edges, no sketch lines.
Shading: ${
    shading === "none"
      ? "no shading at all"
      : "minimal simple hatching in small areas only"
  }, no gradients.
Composition: ${framing}, ${view}, subject fully visible, no cropped limbs, readable silhouette, ${aspectRatio} orientation.
Mood: ${mood}.
Background: pure white background, no texture, no environment, no shadows, no extra objects unless specified.
Output: monochrome only (black ink on white), high contrast, ${aspectRatio} aspect ratio, portrait format image.

Negative prompts: color, grayscale, photorealism, 3D render, pencil texture, watercolor, noisy lines, blur, cluttered background, text, watermark, landscape orientation, square format.
  `.trim();
}

/**
 * Default prompt options
 */
const defaultOptions = {
  framing: "full-body",
  view: "front view",
  shading: "none",
  mood: "playful and friendly",
  aspectRatio: "2:3 portrait",
};

module.exports = {
  buildMarkerCartoonPrompt,
  defaultOptions,
};
