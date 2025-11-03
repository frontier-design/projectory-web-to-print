# Deploy to Render.com - Quick Steps

## Everything is Ready!

All code has been committed locally. Now you just need to push and deploy!

## Step 1: Push to GitHub (Manual - Requires Your Credentials)

Open a terminal and run:

```bash
cd /Users/imaginecats/Desktop/projectory-web-to-print
git push origin main
```

You'll be prompted for your GitHub credentials. Once pushed, you're ready for Step 2!

## Step 2: Deploy on Render.com

1. **Go to https://render.com**
   - Sign up or login (can use your GitHub account)

2. **Create New Web Service**
   - Click "New +" in top right
   - Select "Web Service"

3. **Connect Repository**
   - Click "Connect account" if needed
   - Find and select: `projectory-web-to-print`
   - Click "Connect"

4. **Configure Service** (Render auto-detects from render.yaml):
   - **Name**: projectory-pdf-server (or your choice)
   - **Region**: Oregon (or nearest)
   - **Branch**: main
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Instance Type**: Free

5. **Click "Create Web Service"**

6. **Wait for Build** (5-10 minutes)
   - You'll see logs showing:
     - Installing dependencies
     - Downloading Chromium (for Puppeteer)
     - Starting server
   - When done, you'll see: "PDF Server running on..."

7. **Copy Your Service URL**
   - Will be something like: `https://projectory-pdf-server.onrender.com`

## Step 3: Update Frontend Config

1. **Edit `config.js`** in your project:
   ```javascript
   API_URL: window.location.hostname === 'localhost' 
     ? 'http://localhost:3000'
     : 'https://projectory-pdf-server.onrender.com', // PASTE YOUR RENDER URL HERE
   ```

2. **Push update:**
   ```bash
   git add config.js
   git commit -m "Update production API URL"
   git push origin main
   ```

3. **Wait 1-2 minutes** for GitHub Pages to rebuild

## Step 4: Test It!

1. Go to your GitHub Pages site
2. Select items
3. Click Export
4. First time might take 60 seconds (server waking up)
5. ZIP downloads automatically!

## Done!

Your app is now fully deployed and working in production!

## Notes

- **Local development**: Still works on localhost:3000
- **Production**: Uses Render server automatically
- **Free tier**: Server sleeps after 15 min idle (first request wakes it)
- **Upgrade**: $7/month for always-on service

Enjoy your automated PDF exports!

