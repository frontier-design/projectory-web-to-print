/**
 * PDF Generation Routes
 *
 * Handles PDF generation requests with Puppeteer.
 */

const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");
const JSZip = require("jszip");
const path = require("path");
const fs = require("fs").promises;
const config = require("../config");
const { generateAIImage } = require("../services/ai");
const { generateHTML } = require("../services/html");
const { emitProgress, unregisterJob } = require("../status/progress");

/**
 * OPTIONS /generate-pdfs
 * Handle CORS preflight requests
 */
router.options("/", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  res.sendStatus(204);
});

/**
 * POST /generate-pdfs
 * Generate PDFs for the provided items
 */
router.post("/", async (req, res) => {
  // Set CORS headers explicitly
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const jobId =
    req.body.jobId ||
    `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Track browser instance for cleanup on timeout
  let browser = null;

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      // Ensure CORS headers are set even on early return
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(400).json({ error: "No items provided" });
    }

    // Create timeout promise for the entire request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Request timeout: PDF generation exceeded ${
              config.requestTimeout / 1000
            } seconds`
          )
        );
      }, config.requestTimeout);
    });

    // Wrap PDF generation in Promise.race with timeout
    await Promise.race([
      (async () => {
        emitProgress(jobId, "start", "Starting PDF generation...", {
          totalItems: items.length,
        });
        console.log(
          `Generating PDFs for ${items.length} items... (Job ID: ${jobId})`
        );

        // Read CSS and SVG files
        emitProgress(jobId, "progress", "Reading CSS and assets...");
        console.log("Reading CSS file...");
        const cssPath = path.join(config.serverDir, "styles.css");
        console.log("CSS path:", cssPath);

        // Check if file exists
        try {
          await fs.access(cssPath);
          console.log("CSS file exists");
        } catch (err) {
          console.error("CSS file NOT found at:", cssPath);
          emitProgress(jobId, "error", `CSS file not found at ${cssPath}`);
          throw new Error(
            `CSS file not found at ${cssPath}. Make sure to run npm install which runs copy-assets.js`
          );
        }

        const cssContent = await fs.readFile(cssPath, "utf-8");
        console.log("CSS file read successfully");

        emitProgress(jobId, "progress", "Reading SVG files...");
        console.log("Reading SVG files...");
        const orangeSvgPath = path.join(config.assetsPath, "orange.svg");
        const blueSvgPath = path.join(config.assetsPath, "blue.svg");
        const orangeSvg = await fs.readFile(orangeSvgPath, "base64");
        const blueSvg = await fs.readFile(blueSvgPath, "base64");
        console.log("SVG files read successfully");

        // Read fonts
        emitProgress(jobId, "progress", "Loading fonts...");
        console.log("Reading fonts...");
        const founderGroteskRegular = await fs.readFile(
          path.join(config.fontsPath, "FoundersGrotesk-Regular.otf"),
          "base64"
        );
        const founderGroteskMedium = await fs.readFile(
          path.join(config.fontsPath, "FoundersGrotesk-Medium.otf"),
          "base64"
        );
        const permanentMarker = await fs.readFile(
          path.join(config.fontsPath, "PermanentMarker-Regular.ttf"),
          "base64"
        );
        console.log("Fonts read successfully");

        // Embed fonts in CSS
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

        const BATCH_SIZE = config.batchSize;
        const totalBatches = Math.ceil(items.length / BATCH_SIZE);

        emitProgress(
          jobId,
          "progress",
          `Prepared ${totalBatches} batch(es) for ${items.length} items`
        );

        // Launch Puppeteer
        emitProgress(jobId, "progress", "Launching browser...");
        console.log("Launching Puppeteer...");
        browser = await puppeteer.launch({
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
        emitProgress(jobId, "progress", "Browser launched successfully");
        console.log("Browser launched successfully");

        const zip = new JSZip();

        // Generate PDFs for each batch
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const start = batchIndex * BATCH_SIZE;
          const end = Math.min(start + BATCH_SIZE, items.length);
          const batchItems = items.slice(start, end);

          emitProgress(
            jobId,
            "batch-start",
            `Starting batch ${batchIndex + 1}/${totalBatches}`,
            {
              batchNumber: batchIndex + 1,
              totalBatches,
              itemsInBatch: batchItems.length,
            }
          );
          console.log(
            `Generating batch ${batchIndex + 1}/${totalBatches} (${
              batchItems.length
            } items)...`
          );

          // Generate AI images for all items in this batch
          if (!config.geminiApiKey) {
            emitProgress(
              jobId,
              "warning",
              `Skipping AI image generation for batch ${
                batchIndex + 1
              } - API key not configured`
            );
            console.warn(
              `⚠️  Skipping AI image generation for batch ${
                batchIndex + 1
              } - Google Gemini API key not configured`
            );
          } else {
            emitProgress(
              jobId,
              "progress",
              `Generating AI images for batch ${batchIndex + 1}...`
            );
            console.log(`Generating AI images for batch ${batchIndex + 1}...`);
          }

          emitProgress(
            jobId,
            "image-gen",
            `Generating ${batchItems.length} AI images...`,
            { current: 0, total: batchItems.length }
          );

          const itemsWithImages = await Promise.all(
            batchItems.map(async (item, index) => {
              try {
                const aiImage = await generateAIImage(item.freeText || "");
                emitProgress(
                  jobId,
                  "image-progress",
                  `Generated image ${index + 1}/${batchItems.length}`,
                  { current: index + 1, total: batchItems.length }
                );
                return {
                  ...item,
                  aiImage: aiImage,
                };
              } catch (error) {
                console.error(
                  `Error generating image for item: ${error.message}`
                );
                emitProgress(
                  jobId,
                  "warning",
                  `Image generation failed for item ${index + 1}: ${
                    error.message
                  }`
                );
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
          emitProgress(
            jobId,
            "image-complete",
            `Generated ${imagesGenerated}/${
              batchItems.length
            } images for batch ${batchIndex + 1}`,
            { imagesGenerated, total: batchItems.length }
          );
          console.log(
            `Generated ${imagesGenerated}/${
              batchItems.length
            } images for batch ${batchIndex + 1}`
          );

          // Generate HTML for this batch
          emitProgress(
            jobId,
            "progress",
            `Generating PDF for batch ${batchIndex + 1}...`
          );
          const html = generateHTML(
            itemsWithImages,
            cssWithFonts,
            orangeSvg,
            blueSvg
          );

          // Create a new page
          const page = await browser.newPage();

          // Set content
          emitProgress(
            jobId,
            "progress",
            `Rendering batch ${batchIndex + 1}...`
          );
          await page.setContent(html, {
            waitUntil: "domcontentloaded",
            timeout: config.pdfTimeout,
          });

          // Wait for fonts to load
          await page.evaluateHandle("document.fonts.ready");

          // Additional wait for rendering
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Ensure body height exactly matches content to prevent extra pages
          await page.evaluate(() => {
            const printContainer = document.getElementById("print-container");
            if (printContainer) {
              const containerHeight = printContainer.scrollHeight;
              document.body.style.height = `${containerHeight}px`;
              document.body.style.overflow = "hidden";
              document.documentElement.style.height = `${containerHeight}px`;
              document.documentElement.style.overflow = "hidden";
            }
          });

          // Generate PDF
          emitProgress(
            jobId,
            "progress",
            `Creating PDF for batch ${batchIndex + 1}...`
          );
          // Use explicit dimensions to match CSS @page size: 16.5in x 5in
          // Remove preferCSSPageSize to avoid conflicts with explicit dimensions
          const pdfBuffer = await page.pdf({
            width: "16.5in",
            height: "5in",
            printBackground: true,
            preferCSSPageSize: false,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            displayHeaderFooter: false,
          });

          // Add to ZIP
          zip.file(`comboconvo-${batchIndex + 1}.pdf`, pdfBuffer);
          emitProgress(
            jobId,
            "batch-complete",
            `Completed batch ${batchIndex + 1}/${totalBatches}`,
            { batchNumber: batchIndex + 1, totalBatches }
          );

          await page.close();
        }

        await browser.close();

        // Generate ZIP
        emitProgress(jobId, "progress", "Creating ZIP file...");
        console.log("Creating ZIP file...");
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        emitProgress(jobId, "complete", "PDFs generated successfully!", {
          totalBatches,
          totalItems: items.length,
        });

        // Clean up job progress
        unregisterJob(jobId);

        // Send ZIP
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=comboconvo-pdfs.zip"
        );
        res.send(zipBuffer);

        console.log("PDFs generated and sent!");
      })(),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error("Error generating PDFs:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Clean up browser if it was opened
    if (browser) {
      try {
        await browser.close();
        console.log("Browser closed after error");
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    emitProgress(jobId, "error", `Error: ${error.message}`, {
      stack: error.stack,
    });

    // Clean up job progress
    unregisterJob(jobId);

    // Ensure CORS headers are set even on error
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Check if this is a timeout error
    const isTimeout = error.message && error.message.includes("timeout");
    const statusCode = isTimeout ? 504 : 500;

    if (!res.headersSent) {
      res.status(statusCode).json({
        error: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        jobId,
      });
    }
  }
});

module.exports = router;
