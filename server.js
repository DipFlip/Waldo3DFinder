const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

function serveFile(req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Try to start HTTPS server if certificates exist
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    const httpsServer = https.createServer(options, serveFile);
    const HTTPS_PORT = 8443;

    httpsServer.listen(HTTPS_PORT, () => {
        console.log('='.repeat(60));
        console.log('🔒 HTTPS Server running!');
        console.log('='.repeat(60));
        console.log(`\n📱 Open in browser: https://localhost:${HTTPS_PORT}\n`);
        console.log('⚠️  You may see a security warning (self-signed certificate).');
        console.log('   Click "Advanced" and "Proceed to localhost" to continue.\n');
        console.log('='.repeat(60));
    });
} else {
    console.log('⚠️  SSL certificates not found!');
    console.log('\nPlease run: npm run generate-cert');
    console.log('Or manually create cert.pem and key.pem\n');

    // Fallback to HTTP (won't work for camera access except on some localhost setups)
    const httpServer = http.createServer(serveFile);
    const HTTP_PORT = 8000;

    httpServer.listen(HTTP_PORT, () => {
        console.log('='.repeat(60));
        console.log('⚠️  HTTP Server running (camera may not work)');
        console.log('='.repeat(60));
        console.log(`\n📱 Open in browser: http://localhost:${HTTP_PORT}\n`);
        console.log('Note: Webcam access requires HTTPS. Please generate certificates.\n');
        console.log('='.repeat(60));
    });
}
