# PDF Generation Server

This server uses Puppeteer to automatically generate batched PDFs with your exact CSS styling, and OpenAI DALL-E to generate AI images based on user answers.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up OpenAI API Key** (optional but recommended for AI image generation):
   - Get your API key from https://platform.openai.com/api-keys
   - For local development, create a `.env` file in the `server/` directory:
     ```
     OPENAI_API_KEY=your-api-key-here
     ```
   - For production (Render.com), add the environment variable in the Render dashboard:
     - Go to your service → Environment → Add Environment Variable
     - Key: `OPENAI_API_KEY`
     - Value: Your OpenAI API key
   - **Note**: If the API key is not set, the server will still work but will skip AI image generation.

3. **Start the server**:
   ```bash
   npm start
   ```

   You should see: `PDF Server running on http://localhost:3000`

## How It Works

1. Frontend sends selected item data to `POST /generate-pdfs`
2. Server generates AI images for each item using OpenAI DALL-E (based on `freeText` field)
3. Server splits items into batches of 35
4. For each batch, Puppeteer:
   - Generates HTML with your print CSS and embedded AI images
   - Renders with Chrome (perfect SVG/font support!)
   - Creates PDF (16.5in × 5in, rotate-left)
5. All PDFs packed into ZIP file
6. ZIP automatically downloads to browser

## AI Image Generation

- Images are generated using OpenAI DALL-E 3
- The prompt is based on the `freeText` field from each answer
- Images are generated in parallel for better performance
- If image generation fails (timeout, API error, etc.), the PDF will still be generated without the image
- Each image is embedded as a base64 data URI in the HTML

## Usage

1. Keep server running in terminal: `npm start`
2. Open your web app in browser
3. Select items and click "Export"
4. ZIP file downloads automatically with PDFs containing AI-generated images!

## Troubleshooting

- **"Server error"**: Make sure server is running (`npm start`)
- **CORS error**: Server already has CORS enabled
- **Fonts missing**: Fonts are embedded as base64 in the HTML
- **SVGs missing**: SVGs are embedded as base64 data URIs
- **AI images not appearing**: 
  - Check that `OPENAI_API_KEY` is set correctly
  - Check server logs for OpenAI API errors
  - Images will be skipped if generation fails (graceful degradation)
