#!/bin/bash
echo "=== Building ==="
npm run build

echo ""
echo "=== Deploying to CORRECT Nginx root ==="
rsync -avz --delete dist/ root@69.62.121.168:/var/www/stateofthedart/

echo ""
echo "✅ Deployed to /var/www/stateofthedart/"
