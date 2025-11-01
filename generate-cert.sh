#!/bin/bash

echo "Generating self-signed SSL certificate for localhost..."

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificate generated successfully!"
    echo ""
    echo "Created files:"
    echo "  - key.pem  (private key)"
    echo "  - cert.pem (certificate)"
    echo ""
    echo "You can now run: npm start"
else
    echo ""
    echo "❌ Failed to generate certificate"
    echo "Make sure OpenSSL is installed: sudo apt-get install openssl"
fi
