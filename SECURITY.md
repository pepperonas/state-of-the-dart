# 🔐 **Security Guide - State of the Dart**

## ⚠️ **KRITISCHE SICHERHEITSREGELN**

### **1. API Keys & Secrets NIEMALS öffentlich teilen!**

❌ **NIEMALS:**
- In Git committen
- In Chat-Tools teilen (Slack, Discord, Cursor)
- In Screenshots zeigen
- In Code-Reviews öffentlich posten
- In .env Dateien committen

✅ **IMMER:**
- In .env Dateien speichern (sind in .gitignore)
- Über sichere Kanäle teilen (1Password, LastPass)
- Regelmäßig rotieren (alle 90 Tage)
- Test-Keys für Development verwenden

---

## 🚨 **Was tun wenn Keys kompromittiert wurden?**

### **Sofort-Maßnahmen:**

#### **1. Stripe Keys:**
1. Gehe zu: https://dashboard.stripe.com/apikeys
2. Klicke bei **Secret key** auf **••• → Roll key**
3. Klicke bei **Publishable key** auf **Roll key**
4. Speichere die NEUEN Keys sicher in `.env`

#### **2. JWT Secret:**
```bash
# Neuen Secret generieren
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### **3. Google OAuth:**
1. Gehe zu: https://console.cloud.google.com/apis/credentials
2. Lösche alten Client
3. Erstelle neuen OAuth Client
4. Update Keys in `.env`

#### **4. SMTP Passwort:**
1. Ändere Passwort in deinem Email-Provider
2. Update in `.env`

---

## 📁 **.env Dateien richtig nutzen**

### **Setup:**

```bash
# Frontend (.env im root)
cp env.example .env
# Trage deine Keys ein

# Backend (server/.env)
cd server
cp env.example .env
# Trage deine Keys ein
```

### **Prüfen ob .env in .gitignore ist:**

```bash
cat .gitignore | grep .env
# Sollte zeigen: .env
```

### **Niemals committen:**

```bash
# Prüfen vor jedem Commit
git status

# Falls .env versehentlich staged:
git reset HEAD .env
git reset HEAD server/.env
```

---

## 🔑 **Stripe Setup - Sicher**

### **1. Test-Keys für Development:**

```bash
# server/.env (Development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **2. Live-Keys für Production:**

```bash
# server/.env (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### **3. Price IDs erstellen:**

1. Gehe zu: https://dashboard.stripe.com/products
2. Erstelle Product: "Monthly Subscription" (9,99€ / Monat)
3. Kopiere Price ID: `price_xxx`
4. Erstelle Product: "Lifetime Access" (99,00€ einmalig)
5. Kopiere Price ID: `price_yyy`

```bash
# server/.env
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_LIFETIME=price_yyy
```

### **4. Webhook Endpoint:**

1. Gehe zu: https://dashboard.stripe.com/webhooks
2. Klicke **Add endpoint**
3. URL: `https://your-domain.com/api/payment/webhook`
4. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Kopiere **Signing Secret**: `whsec_...`

```bash
# server/.env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🔐 **JWT Secret - Sicher generieren**

```bash
# Generiere einen sicheren Random String
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Output (Beispiel):
# 8f3a9b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# In server/.env eintragen:
JWT_SECRET=8f3a9b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
SESSION_SECRET=9g4b0c3d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3
```

---

## 🌐 **Google OAuth - Setup**

### **1. Google Cloud Console:**

1. Gehe zu: https://console.cloud.google.com/apis/credentials
2. Erstelle **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `State of the Dart`
5. Authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`

### **2. Keys kopieren:**

```bash
# server/.env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

---

## 📧 **SMTP - Sicher konfigurieren**

⚠️ **WICHTIG:** Passwort NIEMALS öffentlich teilen!

```bash
# server/.env
SMTP_HOST=premium269-4.web-hosting.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=stateofthedart@celox.io
SMTP_PASSWORD=your-secure-password-here  # ⚠️ GEHEIM!
SMTP_FROM=State of the Dart <stateofthedart@celox.io>
```

---

## 🛡️ **Production Security Checklist**

### **Vor dem Deployment:**

- [ ] Alle Secrets in `.env` gespeichert (nicht in Code)
- [ ] `.env` ist in `.gitignore`
- [ ] Keine `.env` Dateien im Git Repository
- [ ] JWT Secret ist min. 64 Zeichen (Random)
- [ ] SESSION_SECRET ist unterschiedlich zu JWT_SECRET
- [ ] Stripe Live-Keys (nicht Test-Keys)
- [ ] Stripe Webhook Secret konfiguriert
- [ ] Google OAuth Redirect URIs für Production eingetragen
- [ ] CORS_ORIGINS nur auf deine Domain beschränkt
- [ ] SMTP Passwort sicher & komplex
- [ ] Rate Limiting aktiviert
- [ ] HTTPS aktiviert (SSL/TLS)
- [ ] Database Backups konfiguriert

### **Nach dem Deployment:**

- [ ] Teste alle Auth-Flows (Email, Google)
- [ ] Teste Stripe Payment (Test Mode → Live Mode)
- [ ] Teste Webhooks (Stripe Dashboard → Events)
- [ ] Monitoring aktiviert (Sentry, LogRocket)
- [ ] Error Logging konfiguriert

---

## 🔄 **Key Rotation Schedule**

| Key Type | Rotation Interval |
|----------|-------------------|
| JWT Secret | 90 Tage |
| Session Secret | 90 Tage |
| Stripe Keys | Bei Verdacht sofort |
| Google OAuth | Bei Verdacht sofort |
| SMTP Passwort | 180 Tage |

---

## 📞 **Bei Sicherheitsvorfällen:**

1. **Keys sofort widerrufen** (siehe oben)
2. **Neue Keys generieren**
3. **Logs prüfen** (verdächtige Zugriffe)
4. **User benachrichtigen** (falls nötig)
5. **Incident Report** erstellen

---

## 📚 **Weitere Ressourcen:**

- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

🔒 **Stay Safe!**
