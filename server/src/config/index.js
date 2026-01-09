/**
 * Server configuration module
 * Handles environment variables and global configuration
 */

const path = require("path");

// Load environment variables from .env file if it exists (for local development)
try {
  require("dotenv").config({ path: path.join(__dirname, "../../.env") });
  console.log("Environment variables loaded from .env file");
} catch (e) {
  // dotenv not available, that's okay - environment variables will come from system
  console.log(
    "Note: Could not load .env file, using system environment variables"
  );
}

const config = {
  // Server port
  port: process.env.PORT || 3000,

  // Google Gemini API configuration
  geminiApiKey: process.env.GEMINI_API_KEY || null,

  // Paths
  serverDir: path.join(__dirname, "../.."),
  assetsPath: path.join(__dirname, "../../assets"),
  fontsPath: path.join(__dirname, "../../assets/fonts"),

  // PDF generation settings
  batchSize: 12, // Reduced from 35 to lower memory usage per batch
  pdfTimeout: 60000, // 60 seconds
  requestTimeout: 300000, // 5 minutes for PDF generation (includes AI image generation)
  
  // Image processing settings
  imageChunkSize: 3, // Process images in chunks of 3 to reduce peak memory

  // SSE settings
  heartbeatInterval: 30000, // 30 seconds
};

// Log API key status (without exposing the key)
if (config.geminiApiKey) {
  console.log("Google Gemini API configured");
  console.log(
    "API Key present:",
    config.geminiApiKey ? "Yes (length: " + config.geminiApiKey.length + ")" : "No"
  );
  console.log("Using Gemini API for image generation");
} else {
  console.warn("⚠️  Google Gemini API NOT configured - API key missing!");
  console.warn(
    "   Set GEMINI_API_KEY environment variable or create .env file"
  );
  console.warn(
    "   Get your API key from: https://aistudio.google.com/app/apikey"
  );
}

module.exports = config;
