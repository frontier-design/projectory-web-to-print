// Configuration for development and production environments
const config = {
  // Server API URL - change this when deploying to production
  API_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://your-render-app.onrender.com', // Update this after deploying to Render
};

