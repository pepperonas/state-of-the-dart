# State of the Dart - Backend API

RESTful API server for State of the Dart darts tracking application.

## 🚀 Features

- **SQLite Database** - Fast, reliable, self-contained
- **JWT Authentication** - Secure tenant-based auth
- **RESTful API** - Clean, consistent endpoints
- **TypeScript** - Type-safe development
- **Rate Limiting** - Protection against abuse
- **CORS** - Configurable cross-origin requests

## 📋 Requirements

- Node.js 18+ (with npm)
- SQLite3

## 🛠️ Installation

```bash
cd server
npm install
```

## ⚙️ Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Edit `.env`:

```env
PORT=3002
NODE_ENV=development
DATABASE_PATH=./data/state-of-the-dart.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 🏃 Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## 📚 API Endpoints

### Authentication

- `POST /api/tenants/auth` - Register/Login with tenant
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get tenant by ID
- `DELETE /api/tenants/:id` - Delete tenant

### Players

- `GET /api/players` - Get all players for tenant
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/:id/heatmap` - Get player heatmap data
- `POST /api/players/:id/heatmap` - Update player heatmap
- `GET /api/players/:id/personal-bests` - Get personal bests
- `POST /api/players/:id/personal-bests` - Update personal bests

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match with full details
- `POST /api/matches` - Create new match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match

### Training

- `GET /api/training` - Get all training sessions
- `GET /api/training/:id` - Get session with results
- `POST /api/training` - Create new session
- `PUT /api/training/:id` - Update session
- `DELETE /api/training/:id` - Delete session

### Achievements

- `GET /api/achievements` - Get all achievements
- `GET /api/achievements/player/:playerId` - Get player achievements
- `POST /api/achievements/player/:playerId/unlock` - Unlock achievement
- `PUT /api/achievements/player/:playerId/progress` - Update progress

### Leaderboard

- `GET /api/leaderboard` - Get global leaderboard

### Admin (requires admin privileges)

- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id` - Update user (subscription, admin status)
- `DELETE /api/admin/users/:id` - Delete user

## 🔐 Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Get a token by calling `POST /api/tenants/auth` with:

```json
{
  "tenantId": "unique-tenant-id",
  "name": "Tenant Name",
  "avatar": "👤"
}
```

## 📊 Database Schema

The database automatically initializes with the following tables:

- `tenants` - Tenant/profile management
- `players` - Player data
- `player_stats` - Player statistics
- `matches` - Match records
- `match_players` - Player performance per match
- `legs` - Leg data
- `throws` - Individual throws
- `heatmap_data` - Dart throw heatmaps
- `training_sessions` - Training session records
- `training_results` - Training session results
- `achievements` - Achievement definitions
- `player_achievements` - Unlocked achievements
- `personal_bests` - Player personal best records

## 🚢 Deployment

### VPS Deployment with PM2

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   pm2 start dist/index.js --name "stateofthedart-backend"
   ```

4. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx as reverse proxy** (see DEPLOYMENT_VPS.md)

### Environment Variables (Production)

```env
PORT=3002
NODE_ENV=production
DATABASE_URL=./data/state-of-the-dart.db
JWT_SECRET=<generate-secure-random-string>
CORS_ORIGINS=https://stateofthedart.com,https://api.stateofthedart.com
APP_URL=https://stateofthedart.com
API_URL=https://api.stateofthedart.com
GOOGLE_CALLBACK_URL=https://api.stateofthedart.com/api/auth/google/callback
```

## 📝 Development

### Type Checking

```bash
npx tsc --noEmit
```

### Building

```bash
npm run build
```

## 🐛 Debugging

Enable detailed logging in development:

```env
NODE_ENV=development
```

View PM2 logs:

```bash
pm2 logs stateofthedart-backend
```

## 📄 License

MIT
