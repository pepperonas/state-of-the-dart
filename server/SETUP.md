# 🚀 Backend Setup Guide - Auth & Payment

Komplette Anleitung zur Einrichtung von Email-Auth, Google OAuth und Stripe-Zahlungen.

---

## 📋 Voraussetzungen

- ✅ Node.js 18+ installiert
- ✅ VPS oder lokaler Server
- ✅ Domain (optional, für Production)

---

## 1️⃣ **Stripe Setup** 💳

### Schritt 1: Stripe Account erstellen

1. Gehe zu [stripe.com](https://stripe.com) und erstelle einen Account
2. Aktiviere deinen Account (evtl. Verifizierung erforderlich)

### Schritt 2: API Keys holen

1. Gehe zu **Developers → API keys**
2. Kopiere:
   - **Publishable key** (pk_test_... für Test, pk_live_... für Production)
   - **Secret key** (sk_test_... für Test, sk_live_... für Production)

### Schritt 3: Products & Prices erstellen

#### Monatliches Abo:

1. Gehe zu **Products → Add product**
2. Name: **"State of the Dart - Monatlich"**
3. Price: z.B. **9,99 EUR / Monat**
4. **Recurring**: Monthly
5. Speichern → Kopiere die **Price ID** (price_xxx)

#### Lifetime Purchase:

1. Gehe zu **Products → Add product**
2. Name: **"State of the Dart - Lifetime"**
3. Price: z.B. **99,00 EUR**
4. **One time**
5. Speichern → Kopiere die **Price ID** (price_xxx)

### Schritt 4: Webhook einrichten

1. Gehe zu **Developers → Webhooks**
2. Klicke **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/payment/webhook`
4. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Speichern → Kopiere den **Signing secret** (whsec_xxx)

### Schritt 5: `.env` konfigurieren

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_MONTHLY=price_xxx_monthly
STRIPE_PRICE_ID_LIFETIME=price_xxx_lifetime
```

---

## 2️⃣ **Google OAuth Setup** 🔐

### Schritt 1: Google Cloud Project erstellen

1. Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
2. Klicke **Select a project → New Project**
3. Name: **"State of the Dart"**
4. Erstellen

### Schritt 2: OAuth Consent Screen konfigurieren

1. Gehe zu **APIs & Services → OAuth consent screen**
2. User Type: **External**
3. App name: **"State of the Dart"**
4. User support email: Deine Email
5. Developer contact: Deine Email
6. Speichern

### Schritt 3: OAuth Client erstellen

1. Gehe zu **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: **"State of the Dart Web"**
5. **Authorized JavaScript origins**: Füge hinzu:
   - Development: `http://localhost:5173`
   - Production: `https://stateofthedart.com`
   - Production API: `https://api.stateofthedart.com`
6. **Authorized redirect URIs**: Füge hinzu:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.stateofthedart.com/api/auth/google/callback`
7. Erstellen → Kopiere:
   - **Client ID**
   - **Client Secret**

### Schritt 4: `.env` konfigurieren

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

**Production:**
```env
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback
```

---

## 3️⃣ **SMTP konfigurieren** ⚙️

⚠️ **WICHTIG:** Trage deine eigenen SMTP-Credentials in `.env` ein!

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-secure-smtp-password
SMTP_FROM=Your App Name <your-email@your-domain.com>
```

**Beispiel SMTP-Provider:**
- Gmail: `smtp.gmail.com` (Port 465)
- Outlook: `smtp.office365.com` (Port 587)
- Custom: Frage deinen Hosting-Provider

✅ Nach Konfiguration werden Emails automatisch versendet.

---

## 4️⃣ **Server starten**

### Development:

```bash
cd server
npm install
npm run dev
```

Server läuft auf: `http://localhost:3001`

### Production:

```bash
cd server
npm install
npm run build
npm start
```

Oder mit PM2:
```bash
pm2 start dist/index.js --name stateofthedart-backend
pm2 save
```

---

## 5️⃣ **Testing**

### Auth testen:

1. **Registrierung:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234",
       "name": "Test User"
     }'
   ```

2. **Email checken** → Verification Link klicken

3. **Login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234"
     }'
   ```

### Google OAuth testen:

Browser öffnen: `http://localhost:3001/api/auth/google`

### Stripe testen:

1. **Checkout erstellen:**
   ```bash
   curl -X POST http://localhost:3001/api/payment/create-checkout \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"plan": "monthly"}'
   ```

2. **Stripe Test Cards:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

---

## 6️⃣ **Deployment Production**

### Domain & SSL:

1. Domain zu deinem VPS zeigen lassen
2. Nginx konfigurieren (siehe `deploy-vps.sh`)
3. Let's Encrypt SSL aktivieren

### Environment Variables (Production):

```env
NODE_ENV=production
APP_URL=https://your-domain.com
API_URL=https://api.your-domain.com

# Stripe LIVE Keys verwenden!
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key

# Google OAuth Production Callback
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback

# App & API URLs
APP_URL=https://stateofthedart.com
API_URL=https://api.stateofthedart.com
CORS_ORIGINS=https://stateofthedart.com,https://api.stateofthedart.com

# Strong secrets generieren!
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

### Stripe Production Mode:

1. In Stripe Dashboard: **Activate your account**
2. Ersetze alle Test-Keys durch Live-Keys
3. Webhook-Endpoint auf Production-URL ändern
4. Test-Transaktionen durchführen

---

## 📊 **API Endpoints**

### Auth:
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `GET /api/auth/verify-email/:token` - Email verifizieren
- `POST /api/auth/forgot-password` - Passwort vergessen
- `POST /api/auth/reset-password` - Passwort zurücksetzen
- `GET /api/auth/me` - Aktuellen User abrufen
- `GET /api/auth/google` - Google OAuth starten
- `GET /api/auth/google/callback` - Google OAuth Callback

### Payment:
- `POST /api/payment/create-checkout` - Checkout Session erstellen
- `POST /api/payment/create-portal` - Billing Portal öffnen
- `POST /api/payment/webhook` - Stripe Webhook Handler
- `GET /api/payment/status` - Subscription Status abrufen

---

## 🔒 **Security Best Practices**

✅ **Bereits implementiert:**
- ✅ Password Hashing (bcrypt, 12 rounds)
- ✅ JWT-based Authentication
- ✅ Rate Limiting (100 req/15min)
- ✅ CORS konfigurierbar
- ✅ Helmet Security Headers
- ✅ HTTPS (in Production)
- ✅ Email Verification erforderlich
- ✅ Password Reset mit Token-Expiry
- ✅ Secure Session Cookies

**Zusätzlich empfohlen:**
- [ ] 2FA (optional)
- [ ] CAPTCHA bei Registration (optional)
- [ ] IP-basiertes Rate Limiting (optional)

---

## 🐛 **Troubleshooting**

### Emails kommen nicht an:

1. SMTP-Credentials prüfen
2. Port 465 offen? (Firewall check)
3. Spam-Ordner checken
4. Logs prüfen: `pm2 logs state-of-the-dart-api`

### Google OAuth funktioniert nicht:

1. Redirect URI korrekt konfiguriert?
2. Client ID & Secret korrekt?
3. OAuth Consent Screen veröffentlicht?

### Stripe Webhooks schlagen fehl:

1. Webhook-Endpoint erreichbar? (Public URL!)
2. Signing Secret korrekt?
3. Events korrekt ausgewählt?
4. Stripe Dashboard → Webhooks → Logs checken

---

## 📞 **Support**

Bei Fragen: Check GitHub Issues oder die Dokumentation!

**Viel Erfolg! 🎯🚀**
