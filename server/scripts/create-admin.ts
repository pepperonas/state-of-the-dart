import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { schema, defaultAchievements } from '../src/database/schema';

const ADMIN_EMAIL = 'martinpaush@gmail.com';
const ADMIN_PASSWORD = 'd8jhFWJ3hErj';
const ADMIN_NAME = 'Martin';

async function createAdmin() {
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const db = new Database(dbPath);

  try {
    console.log('🔧 Initializing database schema...');
    db.exec(schema);
    
    // Seed achievements
    const insertAchievement = db.prepare(`
      INSERT OR IGNORE INTO achievements (id, name, description, icon, category, points, rarity, target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const achievement of defaultAchievements) {
      insertAchievement.run(
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.icon,
        achievement.category,
        achievement.points,
        achievement.rarity,
        achievement.target
      );
    }
    
    console.log('✅ Database initialized!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }

  try {
    console.log('🔍 Checking if admin already exists...');

    // Check if admin exists
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`📧 Email: ${ADMIN_EMAIL}`);
      
      // Update admin status
      db.prepare('UPDATE users SET is_admin = 1, subscription_status = ?, email_verified = 1 WHERE email = ?')
        .run('lifetime', ADMIN_EMAIL);
      
      console.log('✅ Admin status and lifetime access granted!');
      return;
    }

    console.log('📝 Creating admin user...');

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Create admin user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, avatar,
        email_verified, is_admin,
        subscription_status, subscription_plan,
        created_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      ADMIN_NAME,
      '👨‍💼',
      1, // email already verified
      1, // is admin
      'lifetime',
      'lifetime',
      Date.now(),
      Date.now()
    );

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔒 Subscription: Lifetime`);
    console.log(`👑 Admin: Yes`);

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

createAdmin();
