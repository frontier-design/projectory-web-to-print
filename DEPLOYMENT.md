# Deployment Guide - Render.com

## Step 1: Push to GitHub

All changes are ready to push. Run:

```bash
git add .
git commit -m "Add Puppeteer PDF server with batched export"
git push origin main
```

## Step 2: Deploy to Render.com

1. Go to https://render.com and sign up/login

2. Click "New +" → "Web Service"

3. Connect your GitHub repository:
   - Select your `projectory-web-to-print` repo
   - Click "Connect"

4. Configure the service:
   - **Name**: projectory-pdf-server (or any name you want)
   - **Region**: Oregon (or nearest to you)
   - **Branch**: main
   - **Root Directory**: (leave empty)
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

5. Click "Create Web Service"

6. Wait 5-10 minutes for deployment (Puppeteer is large)

7. You'll get a URL like: `https://projectory-pdf-server.onrender.com`

## Step 3: Update Frontend Configuration

1. Open `config.js` in your project

2. Replace the production URL:
   ```javascript
   API_URL: window.location.hostname === 'localhost' 
     ? 'http://localhost:3000'
     : 'https://projectory-pdf-server.onrender.com', // Your Render URL here
   ```

3. Commit and push:
   ```bash
   git add config.js
   git commit -m "Update production API URL"
   git push origin main
   ```

4. Wait for GitHub Pages to update (1-2 minutes)

## Step 4: Test Production

1. Go to your GitHub Pages URL
2. Select items
3. Click Export
4. ZIP should download automatically

## Important Notes

### Free Tier Limitations:
- Service spins down after 15 min of inactivity
- First request after idle takes 30-60 seconds to wake up
- 750 hours/month free (enough for small projects)

### Upgrade to $7/month for:
- Always-on (no spin-down)
- Faster response times
- Better for production use

## Troubleshooting

**CORS errors?**
- Server already has CORS enabled, should work

**Timeout errors?**
- Free tier might spin down - wait 60s and retry
- Or upgrade to paid tier

**500 errors?**
- Check Render logs in dashboard
- Make sure all files pushed to GitHub

## Success!

Once deployed, your app will:
1. Work locally (uses localhost:3000)
2. Work in production (uses Render URL)
3. Automatically switch based on hostname

