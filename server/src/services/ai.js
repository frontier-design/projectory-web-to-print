/**
 * AI Image Generation Service
 *
 * Handles communication with Google Gemini API
 * for generating AI images.
 */

const https = require("https");
const config = require("../config");
const { buildMarkerCartoonPrompt } = require("../prompts/markerCartoon");

/**
 * Generate AI image using Google's Gemini API
 * @param {string} prompt - The text prompt for image generation
 * @param {number} timeout - Timeout in milliseconds (default: 60000)
 * @param {object} promptOptions - Options for prompt building (framing, view, shading, mood)
 * @returns {Promise<string|null>} - Base64 encoded image or null if generation fails
 */
async function generateAIImage(prompt, timeout = 60000, promptOptions = {}) {
  const GEMINI_API_KEY = config.geminiApiKey;

  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key not configured, skipping image generation");
    return null;
  }

  if (!prompt || prompt.trim().length === 0) {
    console.warn("Empty prompt provided, skipping image generation");
    return null;
  }

  try {
    // Build styled prompt using the prompt builder
    const styledPrompt = buildMarkerCartoonPrompt(prompt, promptOptions);

    console.log(
      `Generating AI image for prompt: "${styledPrompt.substring(0, 80)}..."`
    );

    // Create a promise that will timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Image generation timeout")), timeout);
    });

    // Use Google's Gemini API for image generation
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: styledPrompt,
            },
          ],
        },
      ],
    };

    // Make API request
    const imagePromise = new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestBody);
      const url = new URL(apiUrl);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "X-goog-api-key": GEMINI_API_KEY,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode !== 200) {
            let errorMessage = `API request failed: ${res.statusCode}`;
            let errorDetails = "";

            try {
              const errorResponse = JSON.parse(data);
              if (errorResponse.error) {
                errorDetails = errorResponse.error.message || "";
                errorMessage = `API request failed: ${res.statusCode} - ${
                  errorResponse.error.message || "Unknown error"
                }`;
              }
            } catch (e) {
              errorDetails = data.substring(0, 200);
            }

            const error = new Error(errorMessage);
            error.statusCode = res.statusCode;
            error.responseData = errorDetails;
            reject(error);
            return;
          }

          try {
            const response = JSON.parse(data);
            // Gemini API response format: response.candidates[0].content.parts[N].inlineData
            // Image data might be in any part, so search through all parts
            let imageData = null;

            if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  imageData = part.inlineData;
                  break;
                }
              }
            }

            if (imageData) {
              const mimeType = imageData.mimeType || "image/png";
              const base64Data = imageData.data;
              resolve(`data:${mimeType};base64,${base64Data}`);
            } else {
              console.error(
                "No image data found in response. Parts:",
                response.candidates?.[0]?.content?.parts?.map((p) =>
                  Object.keys(p)
                ) || "No parts"
              );
              console.error(
                "Full response:",
                JSON.stringify(response).substring(0, 800)
              );
              reject(new Error("No image data in API response"));
            }
          } catch (parseError) {
            reject(
              new Error(`Failed to parse API response: ${parseError.message}`)
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    const imageBase64 = await Promise.race([imagePromise, timeoutPromise]);
    console.log("AI image generated successfully");
    return imageBase64;
  } catch (error) {
    handleAIError(error);
    return null; // Return null on error to allow graceful degradation
  }
}

/**
 * Handle AI generation errors with appropriate logging
 * @param {Error} error - The error object
 */
function handleAIError(error) {
  const statusCode =
    error.statusCode ||
    (error.message.match(/\d{3}/)
      ? parseInt(error.message.match(/\d{3}/)[0])
      : null);

  // Handle specific error types
  if (statusCode === 429) {
    console.warn("⚠️  Quota exceeded for Gemini API");
    console.warn("   Your free tier quota has been exhausted");
    console.warn("   Check usage: https://ai.dev/rate-limit");
    console.warn("   Manage quota: https://aistudio.google.com/app/apikey");
    if (error.responseData) {
      console.warn("   Details:", error.responseData.substring(0, 200));
    }
  } else if (
    statusCode === 401 ||
    error.message.includes("401") ||
    error.message.includes("UNAUTHENTICATED")
  ) {
    console.error("⚠️  Authentication failed");
    console.error("   Your Gemini API key may be invalid or expired");
    console.error(
      "   Get a new API key from: https://aistudio.google.com/app/apikey"
    );
    if (error.message.includes("Vertex AI")) {
      console.error("   Note: Vertex AI requires OAuth 2.0 access token");
      console.error(
        "   Get an access token with: gcloud auth print-access-token"
      );
    }
  } else if (statusCode === 400) {
    console.error("⚠️  Bad request - Invalid prompt or API parameters");
    if (error.responseData) {
      console.error("   Details:", error.responseData.substring(0, 200));
    }
  } else if (statusCode === 403) {
    console.error("⚠️  Forbidden - API key may not have required permissions");
    console.error("   Check API key permissions in Google AI Studio");
  } else if (statusCode === 500 || statusCode === 503) {
    console.error(
      "⚠️  Server error from Gemini API - Service may be temporarily unavailable"
    );
    console.error("   Please try again later");
  } else if (error.message.includes("timeout")) {
    console.warn("⚠️  Image generation timed out after 60 seconds");
    console.warn("   The request took too long to complete");
  } else {
    console.error("⚠️  Error generating AI image:", error.message);
    if (error.responseData) {
      console.error("   Response:", error.responseData.substring(0, 200));
    }
  }
}

/**
 * Download image from URL and convert to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Base64 encoded image
 */
function downloadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString("base64");
          // Determine content type from URL or default to png
          const contentType = response.headers["content-type"] || "image/png";
          resolve(`data:${contentType};base64,${base64}`);
        });
        response.on("error", reject);
      })
      .on("error", reject);
  });
}

module.exports = {
  generateAIImage,
  downloadImageAsBase64,
};
