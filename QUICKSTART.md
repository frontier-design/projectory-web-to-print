# Quick Start Guide - Automated PDF Export

## ✅ Setup Complete!

I've built a Puppeteer server that automatically generates your PDFs with perfect CSS rendering!

## How to Use

### 1. Start the Server (One Time Setup)

Open a terminal and run:

```bash
cd /Users/imaginecats/Desktop/projectory-web-to-print/server
npm start
```

You should see: `🚀 PDF Server running on http://localhost:3000`

**Keep this terminal window open while using the app!**

### 2. Use Your App

1. Open `index.html` in your browser
2. Select items you want to export
3. Click the **Export** button
4. Confirm the dialog
5. Wait a few seconds (button shows "Generating PDFs...")
6. **ZIP file automatically downloads!** 🎉

### 3. Access Your PDFs

1. Unzip `comboconvo-pdfs.zip`
2. You'll find: `comboconvo-1.pdf`, `comboconvo-2.pdf`, etc.
3. Each PDF contains up to 35 pages with your exact CSS styling!

## What's Different Now?

### Before:
- Click Export → Print dialog → Save manually → Repeat 6 times for 187 items

### Now:
- Click Export → Wait 10-30 seconds → Get ZIP with all 6 PDFs! ✨

## Technical Details

- **Perfect Rendering**: Puppeteer uses real Chrome, so SVGs, fonts, and CSS work perfectly
- **Exact Styling**: Uses your `@media print` CSS (16.5in × 5in, rotate-left)
- **Batching**: 35 items per PDF (configurable in `server.js`)
- **Automatic**: No manual clicking or saving!

## Troubleshooting

**"Export failed" error?**
- Make sure server is running: `cd server && npm start`

**Server won't start?**
- Check if port 3000 is in use
- Try: `PORT=3001 npm start` (then update frontend to use 3001)

**Fonts look wrong?**
- Fonts are embedded as base64 - they should work!
- Check console for errors

## Server is Running Now!

The server is currently running in the background. Try clicking Export in your app! 🚀

