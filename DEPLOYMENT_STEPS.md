# Achievement API Fix - Deployment Steps

## Problem Fixed
- 500 error when loading achievements: `/api/achievements/player/:playerId`
- Missing `game_id` column in `player_achievements` table
- `unlocked_at` was NOT NULL but code tried to set NULL for progress updates

## Quick Deployment (Automated)

Run the deployment script:
```bash
./deploy-achievement-fix.sh
```

## Manual Deployment Steps

### 1. Deploy Backend

SSH to VPS:
```bash
ssh martin@69.62.121.168
```

Navigate to backend directory and pull changes:
```bash
cd /var/www/stateofthedart-backend
git pull origin main
npm install
npm run build
```

### 2. Run Database Migration

Still on VPS, run the migration:
```bash
DB_PATH=/var/www/stateofthedart-backend/data/database.db \
  npx ts-node server/scripts/migrate-player-achievements.ts
```

Expected output:
```
🔧 Migrating player_achievements table...
📁 Database: /var/www/stateofthedart-backend/data/database.db
📋 Checking current table structure...
Current columns: id, player_id, achievement_id, unlocked_at, progress
- game_id exists: false
- unlocked_at is nullable: false
🔄 Recreating table with new structure...
📦 Copying existing data...
🔍 Recreating indexes...
✅ Migration completed successfully!
New columns: id, player_id, achievement_id, unlocked_at, progress, game_id
```

### 3. Restart Backend

```bash
pm2 restart stateofthedart-backend
pm2 save
```

### 4. Deploy Frontend (from local machine)

```bash
# Build frontend (already done)
npm run build

# Copy to VPS
rsync -avz --delete dist/ martin@69.62.121.168:/var/www/stateofthedart/
```

## Verification

### Test Achievement API
```bash
curl https://api.stateofthedart.com/api/achievements/player/5443cb57-833e-4218-94dc-a01c6a691b9c
```

Should return 200 with achievement data (or empty array if no achievements).

### Check Backend Logs
```bash
ssh martin@69.62.121.168 'pm2 logs stateofthedart-backend --lines 50'
```

Look for:
- No 500 errors
- Achievement queries executing successfully

### Test Frontend
1. Open https://stateofthedart.com
2. Navigate to Achievements page
3. Should load without errors

## Rollback (if needed)

If migration fails, restore from backup:
```bash
cd /var/www/stateofthedart-backend/data
cp database.db.backup database.db
pm2 restart stateofthedart-backend
```

## Files Changed
- `server/src/database/schema.ts` - Updated table definition
- `server/scripts/migrate-player-achievements.ts` - Migration script (NEW)
- `deploy-achievement-fix.sh` - Deployment automation (NEW)
