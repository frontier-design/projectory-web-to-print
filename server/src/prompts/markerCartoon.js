/**
 * AI Prompt Builder for Marker / Sharpie Cartoon Style (Pure Black & White)
 *
 * This module contains prompt templates for generating
 * highly consistent marker-style cartoon illustrations using AI.
 *
 * Goals:
 * - Pure two-tone output (black ink on white only)
 * - Consistent linework + composition
 * - No grayscale, gradients, shadows, textures, or realism drift
 * - No shading (no hatching, no crosshatching, no fills for shadows)
 */

/**
 * Build marker cartoon prompt with detailed style instructions
 * @param {string} subject - The subject to draw
 * @param {object} options - Prompt options
 * @param {string} options.framing - Framing type (default: "full-body")
 * @param {string} options.view - View angle (default: "front view")
 * @param {string} options.shading - Shading style (kept for compatibility; forced to none)
 * @param {string} options.mood - Mood description (default: "playful and friendly")
 * @param {string} options.aspectRatio - Aspect ratio label (default: "2:3 portrait")
 * @returns {string} Formatted prompt
 */
function buildMarkerCartoonPrompt(subject, options = {}) {
  const {
    framing = "full-body",
    view = "front view",
    // Kept for compatibility, but ignored to enforce consistency:
    shading = "none",
    mood = "playful and friendly",
    aspectRatio = "2:3 portrait",
  } = options;

  return `
${subject.trim()}, shown clearly and centered.

STYLE LOCK (must follow):
- Hand drawn with a black Sharpie / felt-tip marker on pure white paper.
- Two-tone palette only: pure black ink (#000000) and pure white background (#FFFFFF).
- No grayscale, no gray pixels, no gradients, no soft shadows, no textures.
- High-contrast, hard-thresholded ink look (screen-printed / comic ink consistency).
- Hand drawn clean readable silhouette, simple shapes, cartoon illustration.

LINEWORK:
- Bold smooth outer contour lines.
- Thinner inner details.
- Controlled stroke variation (natural Sharpie pressure variation, but not sketchy).
- No sketch lines, no pencil marks, no scribbles, no messy strokes.

SHADING:
- No shading at all.
- No hatching.
- No crosshatching.
- No filled shadow shapes.

COMPOSITION:
- ${framing}, ${view}.
- Subject fully visible, no cropped limbs, no cut-off edges.
- Single main subject only unless explicitly specified.
- Centered composition, subject occupies ~70% of the frame.
- Straight-on camera, no dramatic perspective tilt.
- ${aspectRatio} orientation.

MOOD:
- ${mood}

BACKGROUND:
- Pure white background only.
- No environment, no scenery, no props unless specified.
- No cast shadow, no drop shadow, no vignette.

OUTPUT REQUIREMENTS:
- Monochrome only: black ink on white.
- No color, no grayscale, no halftones.
- Crisp high-contrast poster-like readability.
- ${aspectRatio} aspect ratio, portrait format image.

NEGATIVE PROMPTS:
color, grayscale, gray, gradients, shadows, soft lighting, texture, paper grain, photorealism, 3D render, pencil, charcoal, watercolor, hatching, crosshatching, shading, shadow shapes, filled shadows, noisy lines, blur, cluttered background, detailed scenery, text, watermark, logo, landscape orientation, square format.
  `.trim();
}

/**
 * Default prompt options
 */
const defaultOptions = {
  framing: "full-body",
  view: "front view",
  shading: "none", // kept for compatibility, prompt enforces none
  mood: "playful and friendly",
  aspectRatio: "2:3 portrait",
};

module.exports = {
  buildMarkerCartoonPrompt,
  defaultOptions,
};
