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
