#!/bin/bash

# VPS Initial Setup Script
# Run this ONCE on your VPS to set everything up
# Usage: bash vps-setup.sh

set -e

echo "🚀 VPS Setup für State of the Dart..."
echo ""

# Update system
echo "📦 System aktualisieren..."
apt-get update
apt-get upgrade -y

# Install Node.js 20
echo "📦 Node.js installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 PM2 installieren..."
npm install -g pm2

# Install Nginx
echo "📦 Nginx installieren..."
apt-get install -y nginx

# Install Certbot
echo "📦 Certbot installieren..."
apt-get install -y certbot python3-certbot-nginx

# Create directories
echo "📁 Verzeichnisse erstellen..."
mkdir -p /var/www/stateofthedart
mkdir -p /opt/server/data

# Install UFW Firewall
echo "🔥 Firewall konfigurieren..."
apt-get install -y ufw
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo ""
echo "✅ VPS Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "1. DNS Records einrichten (A Records für @ und api)"
echo "2. Backend Code hochladen (/opt/server/)"
echo "3. .env Datei erstellen (/opt/server/.env)"
echo "4. Nginx Config erstellen (siehe deploy guide)"
echo "5. SSL Zertifikate mit certbot erstellen"
echo "6. Backend mit PM2 starten"
echo ""
