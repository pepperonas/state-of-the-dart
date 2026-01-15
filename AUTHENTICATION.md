# 🔐 **Authentication & Payment System**

## **Übersicht**

State of the Dart verfügt über ein vollständiges, selbst-gehostetes Auth & Payment-System mit:

- ✅ Email-Registrierung mit Verification
- ✅ Sicheres Login (bcrypt + JWT)
- ✅ Google OAuth 2.0
- ✅ 30-Tage Trial Period
- ✅ Stripe Integration (Abo + Lifetime)
- ✅ SMTP Email-System
- ✅ Rate Limiting & Security

---

## **📁 Verzeichnisstruktur**

### **Frontend**
```
src/
├── services/
│   └── api.ts                    # API Client mit Auth
├── context/
│   └── AuthContext.tsx          # Global Auth State
└── components/
    ├── auth/
    │   ├── Login.tsx            # Login Screen
    │   ├── Register.tsx         # Registrierung
    │   ├── ProtectedRoute.tsx   # Route Guard
    │   ├── VerifyEmail.tsx      # Email Verification
    │   ├── ForgotPassword.tsx   # Passwort vergessen
    │   ├── ResetPassword.tsx    # Passwort zurücksetzen
    │   ├── ResendVerification.tsx  # Verification erneut senden
    │   ├── AuthCallback.tsx     # Google OAuth Callback
    │   └── UserMenu.tsx         # User Dropdown Menu
    └── payment/
        ├── Pricing.tsx          # Preise & Plans
        └── PaymentSuccess.tsx   # Erfolg-Screen
```

### **Backend**
```
server/
├── src/
│   ├── routes/
│   │   ├── auth.ts              # Auth API
│   │   └── payment.ts           # Stripe API
│   ├── services/
│   │   ├── email.ts             # SMTP Service
│   │   └── stripe.ts            # Stripe Integration
│   └── middleware/
│       ├── auth.ts              # JWT Middleware
│       └── subscription.ts      # Subscription Check
└── .env                          # Environment Variables
```

---

## **🚀 Setup**

### **1. Frontend Environment Variables**

Erstelle `.env` im Root:

```bash
# Backend API URL
VITE_API_URL=http://localhost:3001

# Production:
# VITE_API_URL=https://api.your-domain.com
```

### **2. Backend Environment Variables**

Siehe `server/SETUP.md` für vollständige Anleitung!

**Wichtigste Variablen:**
```bash
# JWT Secret
JWT_SECRET=your-super-secret-key-min-32-chars

# SMTP (Email)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_USER=your-email@your-domain.com
SMTP_PASS=your-secure-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_LIFETIME_PRICE_ID=price_xxx
```

---

## **🔧 Verwendung**

### **Auth Context Hook**

```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { 
    user,                    // Current User oder null
    loading,                 // Loading State
    isAuthenticated,         // Boolean
    hasActiveSubscription,   // Boolean
    trialDaysLeft,          // Number
    login,                   // (email, password) => Promise<void>
    register,                // (email, password, name) => Promise<void>
    logout,                  // () => void
    googleAuth,              // () => void
    refreshUser,            // () => Promise<void>
  } = useAuth();

  return <div>...</div>;
}
```

### **Protected Routes**

```typescript
import ProtectedRoute from './components/auth/ProtectedRoute';

<Route 
  path="/game" 
  element={
    <ProtectedRoute requireSubscription={true}>
      <GameScreen />
    </ProtectedRoute>
  } 
/>
```

### **API Calls**

```typescript
import api from '../services/api';

// Login
await api.auth.login(email, password);

// Register
await api.auth.register(email, password, name);

// Stripe Checkout
const { url } = await api.payment.createCheckout('monthly');
window.location.href = url;
```

---

## **📧 Email Templates**

Das System sendet automatisch Emails bei:

1. **Registrierung** → Verification Link
2. **Email Verification** → Welcome Email
3. **Passwort Reset** → Reset Link
4. **Trial Ablauf** → 3 Tage vorher Erinnerung

Alle Templates sind HTML-formatiert mit schönem Design!

---

## **💳 Subscription Tiers**

### **Trial** (30 Tage)
- ✅ Voller Zugriff auf alle Features
- ⏰ Automatische Ablauf-Benachrichtigung

### **Monthly** (9,99€/Monat)
- ✅ Voller Zugriff
- ✅ Jederzeit kündbar
- ✅ Auto-Renewal via Stripe

### **Lifetime** (99,00€)
- ✅ Voller Zugriff
- ✅ Einmalige Zahlung
- ✅ Lebenslanger Zugriff

---

## **🔒 Security Features**

### **Password Security**
- bcrypt Hashing (10 rounds)
- Min. 8 Zeichen Validierung

### **JWT**
- 7 Tage Gültigkeit
- HTTP-only Cookies empfohlen (optional)

### **Rate Limiting**
- Login: 5 Versuche / 15 Min
- Register: 3 Accounts / 15 Min
- Password Reset: 3 Requests / 15 Min

### **CORS**
- Nur definierte Origins erlaubt
- Credentials: true

---

## **🎯 User Flow**

### **Registration Flow**
1. User registriert sich → Email + Password
2. Backend erstellt Account (unverified)
3. Verification-Email wird gesendet
4. User klickt Link → Account wird verifiziert
5. Trial Period (30 Tage) startet
6. Welcome Email wird gesendet
7. User kann sich anmelden

### **Google OAuth Flow**
1. User klickt "Mit Google anmelden"
2. Weiterleitung zu Google
3. Google Auth & Consent
4. Callback zu Backend
5. Account wird erstellt/gefunden
6. JWT Token wird generiert
7. Redirect zu Frontend mit Token
8. User ist eingeloggt

### **Payment Flow**
1. User wählt Plan (Monthly/Lifetime)
2. Redirect zu Stripe Checkout
3. User zahlt
4. Stripe sendet Webhook
5. Backend aktualisiert Subscription
6. User hat vollen Zugriff

---

## **🐛 Troubleshooting**

### **"Invalid token" Error**
- JWT Secret falsch konfiguriert
- Token abgelaufen (7 Tage)
- Token wurde manuell gelöscht

### **Emails kommen nicht an**
- SMTP Credentials prüfen
- Port & TLS Settings checken
- Spam-Ordner prüfen

### **Google OAuth Error**
- Redirect URI in Google Console prüfen
- Client ID/Secret korrekt?
- `http://localhost:3001/api/auth/google/callback`

### **Stripe Webhooks failed**
- Webhook Secret korrekt?
- Endpoint erreichbar? (`/api/payment/webhook`)
- Webhook in Stripe Dashboard aktiviert?

---

## **📚 Weitere Dokumentation**

- **Backend Setup**: `server/SETUP.md`
- **Backend API**: `server/README.md`
- **Stripe Config**: `server/SETUP.md#stripe-konfiguration`
- **Google OAuth**: `server/SETUP.md#google-oauth-konfiguration`

---

## **✨ Features Checklist**

- [x] Email Registration + Verification
- [x] Secure Login (bcrypt + JWT)
- [x] Google OAuth 2.0
- [x] Password Reset Flow
- [x] 30-Day Trial Period
- [x] Stripe Monthly Subscription
- [x] Stripe Lifetime Purchase
- [x] Stripe Webhooks
- [x] User Profile Management
- [x] Protected Routes
- [x] Rate Limiting
- [x] Email Templates (HTML)
- [x] Subscription Status UI
- [x] Trial Days Counter
- [x] Customer Portal (Stripe)

---

🎉 **Das komplette Auth & Payment System ist fertig!**
