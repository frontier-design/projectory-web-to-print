// Copy necessary assets into server folder for deployment
const fs = require("fs");
const path = require("path");

const filesToCopy = [
  { src: "../styles.css", dest: "./styles.css" },
  { src: "../assets/orange.svg", dest: "./assets/orange.svg" },
  { src: "../assets/blue.svg", dest: "./assets/blue.svg" },
  {
    src: "../assets/fonts/FoundersGrotesk-Regular.otf",
    dest: "./assets/fonts/FoundersGrotesk-Regular.otf",
  },
  {
    src: "../assets/fonts/FoundersGrotesk-Medium.otf",
    dest: "./assets/fonts/FoundersGrotesk-Medium.otf",
  },
  {
    src: "../assets/fonts/PermanentMarker-Regular.ttf",
    dest: "./assets/fonts/PermanentMarker-Regular.ttf",
  },
];

// Create directories
const dirs = ["./assets", "./assets/fonts"];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy files
filesToCopy.forEach(({ src, dest }) => {
  try {
    const srcPath = path.join(__dirname, src);
    const destPath = path.join(__dirname, dest);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Failed to copy ${src}:`, err.message);
  }
});

console.log("Asset copy complete!");
