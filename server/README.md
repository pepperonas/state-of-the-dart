# State of the Dart - Backend

Express + TypeScript + SQLite Backend mit JWT Auth, Stripe Payments und Google OAuth.

## Features

- SQLite mit better-sqlite3 (synchron, schnell)
- JWT Authentication + Google OAuth
- Stripe Subscription & Lifetime Payments
- Multi-Tenant Architektur
- Rate Limiting, CORS, Helmet Security

## Requirements

- Node.js 18+
- SQLite3

## Installation

```bash
npm install
cp .env.example .env  # Anpassen!
npm run build
npm start
```

## Konfiguration

### Environment Variables

```env
# Server
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://stateofthedart.com

# Database
DATABASE_PATH=./data/state-of-the-dart.db

# Auth
JWT_SECRET=<random-64-chars>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_LIFETIME=price_...

# Google OAuth
GOOGLE_CLIENT_ID=...googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
SMTP_FROM=State of the Dart <noreply@example.com>
```

### Stripe Setup

1. **Account**: https://dashboard.stripe.com
2. **API Keys**: Developers > API Keys
3. **Products erstellen**:
   - Monthly: 9.99 EUR/Monat (recurring)
   - Lifetime: 99.00 EUR (one_time)
4. **Webhook**: Developers > Webhooks > Add endpoint
   - URL: `https://api.stateofthedart.com/api/payment/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`

### Google OAuth Setup

1. **Google Cloud Console**: https://console.cloud.google.com
2. **OAuth Consent Screen**: APIs & Services > OAuth consent screen
3. **OAuth Client ID**: APIs & Services > Credentials > Create OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://api.stateofthedart.com/api/auth/google/callback`
4. **Client ID & Secret** in `.env` eintragen

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/register` | Registrierung |
| POST | `/login` | Login |
| GET | `/verify-email/:token` | Email verifizieren |
| POST | `/forgot-password` | Passwort-Reset anfordern |
| POST | `/reset-password` | Neues Passwort setzen |
| GET | `/me` | Aktueller User |
| GET | `/google` | Google OAuth Start |
| GET | `/google/callback` | Google OAuth Callback |

### Payment (`/api/payment`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/create-checkout` | Stripe Checkout erstellen |
| POST | `/create-portal` | Stripe Portal (Abo verwalten) |
| POST | `/webhook` | Stripe Webhook |
| GET | `/status` | Subscription Status |

### Tenants (`/api/tenants`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/` | Alle Profile |
| POST | `/` | Profil erstellen |
| PUT | `/:id` | Profil aktualisieren |
| DELETE | `/:id` | Profil löschen |

### Players (`/api/players`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/` | Alle Spieler (mit Stats) |
| POST | `/` | Spieler erstellen |
| PUT | `/:id` | Spieler aktualisieren |
| DELETE | `/:id` | Spieler löschen |
| GET | `/:id/stats` | Detaillierte Statistiken |
| PUT | `/:id/stats` | Stats aktualisieren |
| GET | `/:id/personal-bests` | Personal Bests |
| PUT | `/:id/personal-bests` | Personal Bests aktualisieren |
| GET | `/:id/heatmap` | Heatmap-Daten |

### Matches (`/api/matches`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/` | Match-Historie |
| POST | `/` | Match speichern |
| GET | `/:id` | Match-Details |
| DELETE | `/:id` | Match löschen |
| GET | `/player/:playerId/heatmap` | Spieler-Heatmap |

### Training (`/api/training`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/sessions` | Alle Sessions |
| POST | `/sessions` | Session speichern |
| GET | `/sessions/:id` | Session-Details |
| DELETE | `/sessions/:id` | Session löschen |
| GET | `/stats/:playerId` | Trainings-Statistiken |

### Achievements (`/api/achievements`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/:playerId` | Spieler-Achievements |
| POST | `/sync` | Achievements synchronisieren |
| GET | `/all/:playerId` | Alle mit Status |
| POST | `/unlock` | Achievement freischalten |

### Admin (`/api/admin`)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/users` | Alle User |
| PUT | `/users/:id` | User aktualisieren |
| DELETE | `/users/:id` | User löschen |

## Datenbank Schema

13 Tabellen: `tenants`, `players`, `player_stats`, `matches`, `match_players`, `legs`, `throws`, `heatmap_data`, `training_sessions`, `training_results`, `achievements`, `player_achievements`, `personal_bests`

Schema: `src/database/schema.ts`

## Deployment (PM2)

```bash
# Build & Start
npm run build
pm2 start dist/index.js --name stateofthedart-backend

# Logs & Monitoring
pm2 logs stateofthedart-backend
pm2 monit

# Restart/Reload
pm2 restart stateofthedart-backend
pm2 reload stateofthedart-backend  # Zero-downtime
```

## Testing

### Auth testen
```bash
# Registrieren
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Stripe Test-Karten
- **Erfolg**: 4242 4242 4242 4242
- **Abgelehnt**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## Security Checklist

- [ ] JWT_SECRET ist lang und zufällig (min. 64 Zeichen)
- [ ] HTTPS in Produktion
- [ ] Stripe Webhook Secret korrekt
- [ ] CORS auf Frontend-Domain beschränkt
- [ ] Rate Limiting aktiv (100 req/15min)
- [ ] Sensitive Daten nicht in Logs

## Troubleshooting

**Stripe Webhook 400**: Webhook Secret prüfen, Raw Body Parser aktiv?
**Google OAuth Fehler**: Redirect URI exakt konfiguriert?
**JWT Fehler**: Token abgelaufen oder Secret geändert?
**SMTP Fehler**: Port 587 (TLS) oder 465 (SSL), Credentials prüfen
