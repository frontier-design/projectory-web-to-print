# PDF Generation Server

This server uses Puppeteer to automatically generate batched PDFs with your exact CSS styling.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

   You should see: `🚀 PDF Server running on http://localhost:3000`

## How It Works

1. Frontend sends selected item data to `POST /generate-pdfs`
2. Server splits items into batches of 35
3. For each batch, Puppeteer:
   - Generates HTML with your print CSS
   - Renders with Chrome (perfect SVG/font support!)
   - Creates PDF (16.5in × 5in, rotate-left)
4. All PDFs packed into ZIP file
5. ZIP automatically downloads to browser

## Usage

1. Keep server running in terminal: `npm start`
2. Open your web app in browser
3. Select items and click "Export"
4. ZIP file downloads automatically!

## Troubleshooting

- **"Server error"**: Make sure server is running (`npm start`)
- **CORS error**: Server already has CORS enabled
- **Fonts missing**: Fonts are embedded as base64 in the HTML
- **SVGs missing**: SVGs are embedded as base64 data URIs

