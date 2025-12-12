const express = require("express");
const puppeteer = require("puppeteer");
const JSZip = require("jszip");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const OpenAI = require("openai");
const https = require("https");

// Load environment variables from .env file if it exists (for local development)
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
  console.log("Environment variables loaded from .env file");
} catch (e) {
  // dotenv not available, that's okay - environment variables will come from system
  console.log(
    "Note: Could not load .env file, using system environment variables"
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow GitHub Pages origin
app.use(
  cors({
    origin: "*", // Allow all origins (or specify your GitHub Pages URL)
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

app.use(express.json({ limit: "50mb" }));

// Read CSS and fonts - use local copies in server folder (copied during build)
const assetsPath = path.join(__dirname, "assets");
const fontsPath = path.join(assetsPath, "fonts");

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Debug: Log API key status (without exposing the key)
if (openai) {
  console.log("OpenAI client initialized successfully");
  console.log(
    "API Key present:",
    process.env.OPENAI_API_KEY
      ? "Yes (length: " + process.env.OPENAI_API_KEY.length + ")"
      : "No"
  );
} else {
  console.warn("⚠️  OpenAI client NOT initialized - API key missing!");
  console.warn(
    "   Set OPENAI_API_KEY environment variable or create .env file"
  );
}

/**
 * Generate AI image using OpenAI DALL-E API
 * @param {string} prompt - The text prompt for image generation
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string|null>} - Base64 encoded image or null if generation fails
 */
async function generateAIImage(prompt, timeout = 30000) {
  if (!openai) {
    console.warn("OpenAI API key not configured, skipping image generation");
    return null;
  }

  if (!prompt || prompt.trim().length === 0) {
    console.warn("Empty prompt provided, skipping image generation");
    return null;
  }

  try {
    console.log(
      `Generating AI image for prompt: "${prompt.substring(0, 50)}..."`
    );

    // Create a promise that will timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Image generation timeout")), timeout);
    });

    // Generate image with timeout
    const imagePromise = openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const response = await Promise.race([imagePromise, timeoutPromise]);
    const imageUrl = response.data[0].url;

    if (!imageUrl) {
      console.error("No image URL returned from OpenAI");
      return null;
    }

    // Download image and convert to base64
    const imageBase64 = await downloadImageAsBase64(imageUrl);
    console.log("AI image generated successfully");
    return imageBase64;
  } catch (error) {
    console.error("Error generating AI image:", error.message);
    return null; // Return null on error to allow graceful degradation
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "PDF server is running" });
});

// Diagnostics endpoint
app.get("/diagnostics", async (req, res) => {
  const fsSync = require("fs");
  const diagnostics = {
    __dirname: __dirname,
    cssExists: fsSync.existsSync(path.join(__dirname, "styles.css")),
    cssPath: path.join(__dirname, "styles.css"),
    assetsExists: fsSync.existsSync(path.join(__dirname, "assets")),
    assetsPath: path.join(__dirname, "assets"),
    orangeSvgExists: fsSync.existsSync(
      path.join(__dirname, "assets", "orange.svg")
    ),
    blueSvgExists: fsSync.existsSync(
      path.join(__dirname, "assets", "blue.svg")
    ),
    fontsDir: fsSync.existsSync(path.join(__dirname, "assets", "fonts")),
    parentDirContents: (() => {
      try {
        return fsSync.readdirSync(path.join(__dirname, ".."));
      } catch (e) {
        return "Error reading parent: " + e.message;
      }
    })(),
    serverDirContents: fsSync.readdirSync(__dirname),
  };
  res.json(diagnostics);
});

// Debug endpoint to see generated HTML
app.post("/debug-html", async (req, res) => {
  try {
    const { items } = req.body;
    const cssContent = await fs.readFile(
      path.join(__dirname, "..", "styles.css"),
      "utf-8"
    );
    const orangeSvg = await fs.readFile(
      path.join(assetsPath, "orange.svg"),
      "base64"
    );
    const blueSvg = await fs.readFile(
      path.join(assetsPath, "blue.svg"),
      "base64"
    );

    const founderGroteskRegular = await fs.readFile(
      path.join(fontsPath, "FoundersGrotesk-Regular.otf"),
      "base64"
    );
    const founderGroteskMedium = await fs.readFile(
      path.join(fontsPath, "FoundersGrotesk-Medium.otf"),
      "base64"
    );
    const permanentMarker = await fs.readFile(
      path.join(fontsPath, "PermanentMarker-Regular.ttf"),
      "base64"
    );

    const cssWithFonts = cssContent
      .replace(
        /url\('\.\/assets\/fonts\/FoundersGrotesk-Regular\.otf'\)/g,
        `url(data:font/opentype;base64,${founderGroteskRegular})`
      )
      .replace(
        /url\('\.\/assets\/fonts\/FoundersGrotesk-Medium\.otf'\)/g,
        `url(data:font/opentype;base64,${founderGroteskMedium})`
      )
      .replace(
        /url\('\.\/assets\/fonts\/PermanentMarker-Regular\.ttf'\)/g,
        `url(data:font/truetype;base64,${permanentMarker})`
      );

    const html = generateHTML(items || [], cssWithFonts, orangeSvg, blueSvg);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate HTML for a batch of items
// items should have structure: { whatIsA, thatCould, freeText, aiImage? }
// aiImage is optional base64 data URI or null
function generateHTML(items, cssContent, orangeSvg, blueSvg) {
  const printSurfaces = items
    .map((item) => {
      // Escape HTML in text content to prevent XSS
      const escapeHtml = (text) => {
        if (!text) return "";
        const div = { innerHTML: "" };
        return String(text)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

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

app.post("/generate-pdfs", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    console.log(`Generating PDFs for ${items.length} items...`);

    // Read CSS and SVG files (from local server directory)
    console.log("Reading CSS file...");
    console.log("__dirname:", __dirname);
    const cssPath = path.join(__dirname, "styles.css");
    console.log("CSS path:", cssPath);

    // Check if file exists
    try {
      await fs.access(cssPath);
      console.log("CSS file exists");
    } catch (err) {
      console.error("CSS file NOT found at:", cssPath);
      throw new Error(
        `CSS file not found at ${cssPath}. Make sure to run npm install which runs copy-assets.js`
      );
    }

    const cssContent = await fs.readFile(cssPath, "utf-8");
    console.log("CSS file read successfully");

    console.log("Reading SVG files...");
    const orangeSvgPath = path.join(assetsPath, "orange.svg");
    const blueSvgPath = path.join(assetsPath, "blue.svg");
    console.log("Orange SVG path:", orangeSvgPath);
    console.log("Blue SVG path:", blueSvgPath);
    const orangeSvg = await fs.readFile(orangeSvgPath, "base64");
    const blueSvg = await fs.readFile(blueSvgPath, "base64");
    console.log("SVG files read successfully");

    // Read fonts
    console.log("Reading fonts...");
    const founderGroteskRegular = await fs.readFile(
      path.join(fontsPath, "FoundersGrotesk-Regular.otf"),
      "base64"
    );
    const founderGroteskMedium = await fs.readFile(
      path.join(fontsPath, "FoundersGrotesk-Medium.otf"),
      "base64"
    );
    const permanentMarker = await fs.readFile(
      path.join(fontsPath, "PermanentMarker-Regular.ttf"),
      "base64"
    );
    console.log("Fonts read successfully");

    // Embed fonts in CSS - replace entire src declarations
    const cssWithFonts = cssContent
      .replace(
        /url\('\.\/assets\/fonts\/FoundersGrotesk-Regular\.otf'\)\s*format\('opentype'\)/g,
        `url(data:font/opentype;base64,${founderGroteskRegular}) format('opentype')`
      )
      .replace(
        /url\('\.\/assets\/fonts\/FoundersGrotesk-RegularItalic\.otf'\)\s*format\('opentype'\)/g,
        `url(data:font/opentype;base64,${founderGroteskRegular}) format('opentype')`
      )
      .replace(
        /url\('\.\/assets\/fonts\/FoundersGrotesk-Medium\.otf'\)\s*format\('opentype'\)/g,
        `url(data:font/opentype;base64,${founderGroteskMedium}) format('opentype')`
      )
      .replace(
        /url\('\.\/assets\/fonts\/PermanentMarker-Regular\.ttf'\)\s*format\('truetype'\)/g,
        `url(data:font/truetype;base64,${permanentMarker}) format('truetype')`
      );

    const BATCH_SIZE = 35;
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    // Launch Puppeteer with macOS-compatible args
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
    console.log("Browser launched successfully");

    const zip = new JSZip();

    // Generate PDFs for each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, items.length);
      const batchItems = items.slice(start, end);

      console.log(
        `Generating batch ${batchIndex + 1}/${totalBatches} (${
          batchItems.length
        } items)...`
      );

      // Generate AI images for all items in this batch (in parallel for better performance)
      if (!openai) {
        console.warn(
          `⚠️  Skipping AI image generation for batch ${
            batchIndex + 1
          } - OpenAI API key not configured`
        );
        console.warn(
          "   Set OPENAI_API_KEY environment variable to enable image generation"
        );
      } else {
        console.log(`Generating AI images for batch ${batchIndex + 1}...`);
      }

      const itemsWithImages = await Promise.all(
        batchItems.map(async (item) => {
          try {
            const aiImage = await generateAIImage(item.freeText || "");
            return {
              ...item,
              aiImage: aiImage, // Will be null if generation fails
            };
          } catch (error) {
            console.error(`Error generating image for item: ${error.message}`);
            // Continue without image on error
            return {
              ...item,
              aiImage: null,
            };
          }
        })
      );

      const imagesGenerated = itemsWithImages.filter(
        (item) => item.aiImage !== null
      ).length;
      console.log(
        `Generated ${imagesGenerated}/${batchItems.length} images for batch ${
          batchIndex + 1
        }`
      );

      // Generate HTML for this batch with images
      const html = generateHTML(
        itemsWithImages,
        cssWithFonts,
        orangeSvg,
        blueSvg
      );

      // Create a new page with increased timeout
      const page = await browser.newPage();

      // Set content with longer timeout and less strict wait condition
      await page.setContent(html, {
        waitUntil: "domcontentloaded", // Less strict than networkidle0
        timeout: 60000, // 60 second timeout
      });

      // Wait for fonts to load
      await page.evaluateHandle("document.fonts.ready");

      // Additional wait for rendering and font application
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate PDF with print CSS
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      // Add to ZIP
      zip.file(`comboconvo-${batchIndex + 1}.pdf`, pdfBuffer);

      await page.close();
    }

    await browser.close();

    // Generate ZIP
    console.log("Creating ZIP file...");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Send ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=comboconvo-pdfs.zip"
    );
    res.send(zipBuffer);

    console.log("PDFs generated and sent!");
  } catch (error) {
    console.error("Error generating PDFs:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Server running on http://localhost:${PORT}`);
});
