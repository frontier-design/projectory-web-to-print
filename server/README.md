# PDF Generation Server

This server uses Puppeteer to automatically generate batched PDFs with your exact CSS styling, and Google Gemini to generate AI images based on user answers.

## Project Structure

The server follows a modular architecture for maintainability:

```
server/
  src/
    config/
      index.js           # Configuration and environment variables
    routes/
      index.js           # Route aggregator
      health.js          # Health check endpoint
      status.js          # SSE status endpoints
      pdf.js             # PDF generation endpoint
      diagnostics.js     # Diagnostics endpoint
    services/
      ai.js              # AI image generation service (Gemini)
      html.js            # HTML generation for PDFs
    utils/
      validation.js      # Validation helpers (jobId, HTML escaping)
    prompts/
      markerCartoon.js   # AI prompt builder for marker cartoon style
    status/
      progress.js        # Progress tracking and SSE management
  server.js              # Main entry point (~50 lines)
  test-gemini.js         # API test script
  package.json
  ...
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Google Gemini API** (for AI image generation):
   
   a. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   
   b. Create a `.env` file in the `server/` directory:
      ```
      GEMINI_API_KEY=your-api-key-here
      ```
   
   c. Test the connection:
      ```bash
      node test-gemini.js
      ```
   
   **Note**: If the API key is not set, the server will still work but will skip AI image generation.

3. **Start the server**:
   ```bash
   npm start
   ```

   You should see:
   ```
   PDF Server running on http://localhost:3000

   Available endpoints:
     GET  /health          - Health check
     GET  /diagnostics     - Server diagnostics
     GET  /status/:jobId   - SSE progress updates
     GET  /test-sse/:jobId - Test SSE connection
     POST /generate-pdfs   - Generate PDF batch
     POST /debug-html      - Preview generated HTML
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check - returns server status |
| `/diagnostics` | GET | Server diagnostics - file paths and asset status |
| `/status/:jobId` | GET | SSE endpoint for real-time progress updates |
| `/test-sse/:jobId` | GET | Test SSE connection (sends test messages) |
| `/generate-pdfs` | POST | Generate PDFs for items and return as ZIP |
| `/debug-html` | POST | Preview generated HTML for debugging |

## How It Works

1. Frontend sends selected item data to `POST /generate-pdfs`
2. Server generates AI images for each item using Google Gemini (based on `freeText` field)
3. Server splits items into batches of 35
4. For each batch, Puppeteer:
   - Generates HTML with your print CSS and embedded AI images
   - Renders with Chrome (perfect SVG/font support!)
   - Creates PDF (16.5in × 5in, rotate-left)
5. All PDFs packed into ZIP file
6. ZIP automatically downloads to browser
7. Real-time progress updates sent via Server-Sent Events

## AI Image Generation

- Images are generated using Google's Gemini 2.5 Flash Image API
- Uses a customized "marker cartoon" prompt style for consistent illustration output
- The prompt is based on the `freeText` field from each answer
- Images are generated in parallel for better performance
- If image generation fails (timeout, API error, quota exceeded), the PDF will still be generated without the image
- Each image is embedded as a base64 data URI in the HTML

## Real-Time Status Updates

The server uses Server-Sent Events (SSE) to stream progress updates to the client:

- Connection confirmation
- Asset loading progress
- Batch start/complete
- Individual image generation progress
- Warnings and errors
- Completion status

## Usage

1. Keep server running in terminal: `npm start`
2. Open your web app in browser
3. Select items and click "Export"
4. Watch real-time progress in the status panel
5. ZIP file downloads automatically with PDFs containing AI-generated images!

## Troubleshooting

- **"Server error"**: Make sure server is running (`npm start`)
- **CORS error**: Server already has CORS enabled
- **Fonts missing**: Fonts are embedded as base64 in the HTML
- **SVGs missing**: SVGs are embedded as base64 data URIs
- **AI images not appearing**: 
  - Check that `GEMINI_API_KEY` is set correctly
  - Verify the API key has image generation permissions
  - Check server logs for Gemini API errors
  - Test with: `node test-gemini.js`
- **Quota exceeded (429 error)**:
  - Check usage: https://ai.dev/rate-limit
  - Manage quota: https://aistudio.google.com/app/apikey
- **Status updates not showing**:
  - Check browser console for SSE connection errors
  - Verify server is accessible (test `/test-sse/test-job`)