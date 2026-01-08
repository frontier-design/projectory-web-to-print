/**
 * Quick test script to verify Google Generative AI API is working
 * Uses the modular AI service for testing
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Use the modular AI service
const { generateAIImage } = require("./src/services/ai");
const config = require("./src/config");

console.log("Testing Google Generative AI API connection...");
console.log(
  "API Key present:",
  config.geminiApiKey
    ? "Yes (length: " + config.geminiApiKey.length + ")"
    : "No"
);

if (!config.geminiApiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in environment variables");
  console.error("   Make sure .env file exists in the server directory");
  process.exit(1);
}

async function testImageGeneration() {
  try {
    console.log("\nGenerating test image...");
    console.log("Using Gemini 2.5 Flash Image API...");

    const testPrompt = "a simple red circle on a white background";
    const result = await generateAIImage(testPrompt, 30000, {
      framing: "centered",
      view: "front view",
      shading: "none",
      mood: "simple and clean",
    });

    if (result) {
      console.log("✅ SUCCESS! Image generated");
      console.log("   Image data length:", result.length, "bytes");
      console.log("\n✅ Google Gemini API is working correctly!");
      return true;
    } else {
      console.error("❌ ERROR: No image data returned");
      console.error("   Check the console output above for error details");
      return false;
    }
  } catch (error) {
    console.error("❌ ERROR generating image:");
    console.error("   Message:", error.message);
    return false;
  }
}

testImageGeneration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error.message);
    process.exit(1);
  });
