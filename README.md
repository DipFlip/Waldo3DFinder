# 3D Head-Tracked Finding Waldo Game

A web-based game that uses head tracking from your webcam to navigate a 3D scene and find Waldo hidden behind colorful geometric shapes.

### Quick Start (HTTPS - Recommended)

1. Generate a self-signed SSL certificate:
```bash
# Linux/Mac
npm run generate-cert

# Or manually
bash generate-cert.sh

# Windows
generate-cert.bat
```

2. Start the HTTPS server:
```bash
npm start
```

3. Open `https://localhost:8443` in your browser

4. Accept the security warning (it's safe - it's your own self-signed certificate)
   - Click "Advanced" → "Proceed to localhost"

## Deployment

This project is ready to deploy to Vercel or Netlify! Both platforms provide automatic HTTPS, which is required for webcam access.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/Waldo3DFinder)

**Manual deployment:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/Waldo3DFinder)

**Manual deployment:**
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy`
3. For production: `netlify deploy --prod`

**Or use the Netlify web UI:**
1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Deploy settings are already configured in `netlify.toml`

### Configuration Files

- `vercel.json` - Vercel deployment configuration
- `netlify.toml` - Netlify deployment configuration

Both configurations include:
- Proper MIME types for all assets
- Security headers (CORS, X-Frame-Options, etc.)
- Support for the GLB 3D model file
