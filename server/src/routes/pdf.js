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
 * Get current memory usage in MB
 * @returns {Object} Memory usage stats
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // Resident Set Size
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}

/**
 * Log memory usage
 * @param {string} label - Label for the log entry
 */
function logMemoryUsage(label) {
  const mem = getMemoryUsage();
  console.log(
    `[Memory] ${label}: RSS=${mem.rss}MB, Heap=${mem.heapUsed}/${mem.heapTotal}MB, External=${mem.external}MB`
  );
}

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

    // Per-batch timeout (3 minutes per batch)
    const BATCH_TIMEOUT = 180000; // 3 minutes per batch

    // Generate PDFs without global timeout - process continues even if batches fail
    (async () => {
      logMemoryUsage("Start of PDF generation");
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
      logMemoryUsage("Before browser launch");
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
          "--single-process", // Reduces memory usage (single process instead of multiple)
          "--disable-extensions", // Disable extensions to save memory
          "--disable-software-rasterizer", // Disable software rasterizer
          "--disable-background-timer-throttling", // Reduce background processes
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
        ],
      });
      emitProgress(jobId, "progress", "Browser launched successfully");
      console.log("Browser launched successfully");
      logMemoryUsage("After browser launch");

      const zip = new JSZip();
      const batchResults = [];
      const failedBatches = [];

      // Generate PDFs for each batch - each batch is independent
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, items.length);
        const batchItems = items.slice(start, end);
        // Calculate 1-based row numbers for this batch
        const itemIndices = Array.from(
          { length: end - start },
          (_, i) => start + i + 1
        );

        try {
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

          // Process images in chunks to reduce peak memory usage
          const CHUNK_SIZE = config.imageChunkSize || 3;
          const itemsWithImages = [];
          let totalGenerated = 0;

          for (let i = 0; i < batchItems.length; i += CHUNK_SIZE) {
            const chunk = batchItems.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(
              chunk.map(async (item, chunkIndex) => {
                const globalIndex = i + chunkIndex;
                try {
                  const aiImage = await generateAIImage(item.freeText || "");
                  totalGenerated++;
                  emitProgress(
                    jobId,
                    "image-progress",
                    `Generated image ${totalGenerated}/${batchItems.length}`,
                    { current: totalGenerated, total: batchItems.length }
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
                    `Image generation failed for item ${globalIndex + 1}: ${
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
            itemsWithImages.push(...chunkResults);
          }

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

          // Add to ZIP and track success
          zip.file(`comboconvo-${batchIndex + 1}.pdf`, pdfBuffer);
          batchResults.push({
            batchIndex: batchIndex + 1,
            success: true,
            pdfBuffer,
          });
          emitProgress(
            jobId,
            "batch-complete",
            `Completed batch ${batchIndex + 1}/${totalBatches}`,
            { batchNumber: batchIndex + 1, totalBatches }
          );

          // Clear image data from memory to allow garbage collection
          itemsWithImages.forEach((item) => {
            item.aiImage = null;
          });
          logMemoryUsage(`After batch ${batchIndex + 1} PDF generation`);

          await page.close();
        } catch (batchError) {
          // Batch failed - log error with row information and continue
          const errorMsg = `Batch ${batchIndex + 1} failed: ${
            batchError.message
          }. Rows in this batch: ${itemIndices.join(", ")}`;
          console.error(errorMsg);
          console.error("Batch error stack:", batchError.stack);

          failedBatches.push({
            batchIndex: batchIndex + 1,
            error: batchError.message,
            rows: itemIndices,
            rowCount: itemIndices.length,
          });

          emitProgress(jobId, "warning", errorMsg);

          // Clean up page if it was created
          try {
            if (typeof page !== "undefined" && page) {
              await page.close();
            }
          } catch (closeError) {
            console.error(
              `Error closing page for failed batch ${batchIndex + 1}:`,
              closeError
            );
          }

          // Continue to next batch - don't abort the entire process
          console.log(
            `Continuing with remaining batches after batch ${
              batchIndex + 1
            } failure...`
          );
        }
      }

      await browser.close();
      logMemoryUsage("After browser close");

      // Generate ZIP with successful batches
      emitProgress(jobId, "progress", "Creating ZIP file...");
      console.log("Creating ZIP file...");
      logMemoryUsage("Before ZIP generation");

      const successCount = batchResults.filter((r) => r.success).length;
      const failedCount = failedBatches.length;

      // Build final ZIP from successful batches
      const finalZip = new JSZip();
      for (const result of batchResults) {
        if (result.success) {
          finalZip.file(
            `comboconvo-${result.batchIndex}.pdf`,
            result.pdfBuffer
          );
        }
      }

      const zipBuffer = await finalZip.generateAsync({ type: "nodebuffer" });
      logMemoryUsage("After ZIP generation");

      // Send success message with batch summary
      if (successCount > 0) {
        emitProgress(
          jobId,
          "complete",
          `PDFs generated: ${successCount} successful, ${failedCount} failed`,
          {
            totalBatches,
            successCount,
            failedCount,
            totalItems: items.length,
          }
        );
      } else {
        emitProgress(jobId, "error", `All batches failed. No PDFs generated.`, {
          totalBatches,
          failedCount,
        });
      }

      // Clean up job progress
      unregisterJob(jobId);

      // Send ZIP with partial results (even if some batches failed)
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=comboconvo-pdfs.zip"
      );
      // Add batch summary to headers for client reference
      res.setHeader("X-Batch-Success-Count", successCount.toString());
      res.setHeader("X-Batch-Failed-Count", failedCount.toString());
      res.setHeader("X-Batch-Total-Count", totalBatches.toString());
      if (failedBatches.length > 0) {
        res.setHeader(
          "X-Failed-Batches",
          JSON.stringify(
            failedBatches.map((f) => ({
              batch: f.batchIndex,
              error: f.error,
              rows: f.rows,
              rowCount: f.rowCount,
            }))
          )
        );
      }
      res.send(zipBuffer);

      // Log summary
      console.log(
        `PDF generation complete: ${successCount} successful, ${failedCount} failed`
      );
      if (failedBatches.length > 0) {
        console.log("Failed batches:", failedBatches);
      }
    })();
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
