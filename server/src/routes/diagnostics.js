/**
 * Diagnostics Routes
 * 
 * Endpoints for debugging and diagnostics.
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const config = require("../config");
const { generateHTML } = require("../services/html");

/**
 * GET /diagnostics
 * Returns diagnostic information about the server
 */
router.get("/", async (req, res) => {
  const diagnostics = {
    serverDir: config.serverDir,
    cssExists: fsSync.existsSync(path.join(config.serverDir, "styles.css")),
    cssPath: path.join(config.serverDir, "styles.css"),
    assetsExists: fsSync.existsSync(config.assetsPath),
    assetsPath: config.assetsPath,
    orangeSvgExists: fsSync.existsSync(
      path.join(config.assetsPath, "orange.svg")
    ),
    blueSvgExists: fsSync.existsSync(
      path.join(config.assetsPath, "blue.svg")
    ),
    fontsDir: fsSync.existsSync(config.fontsPath),
    parentDirContents: (() => {
      try {
        return fsSync.readdirSync(path.join(config.serverDir, ".."));
      } catch (e) {
        return "Error reading parent: " + e.message;
      }
    })(),
    serverDirContents: fsSync.readdirSync(config.serverDir),
  };
  res.json(diagnostics);
});

/**
 * POST /debug-html
 * Returns the generated HTML for debugging
 */
router.post("/debug-html", async (req, res) => {
  try {
    const { items } = req.body;
    const cssContent = await fs.readFile(
      path.join(config.serverDir, "..", "styles.css"),
      "utf-8"
    );
    const orangeSvg = await fs.readFile(
      path.join(config.assetsPath, "orange.svg"),
      "base64"
    );
    const blueSvg = await fs.readFile(
      path.join(config.assetsPath, "blue.svg"),
      "base64"
    );

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

module.exports = router;
