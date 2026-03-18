import mysql from 'mysql2/promise'
import crypto from 'crypto'

function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, 'salt', 1000, 64, 'sha512')
    .toString('hex')
}

export async function initializeDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  }

  let conn: mysql.Connection | undefined

  try {
    // Connect without database to create it if it doesn't exist
    conn = await mysql.createConnection(config)
    const dbName = process.env.MYSQL_DATABASE || 'notification'

    // Create database if it doesn't exist
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
    console.log(`Database '${dbName}' created or already exists`)

    // Switch to the database
    await conn.changeUser({ database: dbName })

    // Create users table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        is_admin BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `)
    console.log('Table "users" created or already exists')

    // Create contacts table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20) NOT NULL,
        group_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        UNIQUE KEY unique_user_phone (user_id, phone_number)
      )
    `)
    console.log('Table "contacts" created or already exists')

    // Create contact groups table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS contact_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `)
    console.log('Table "contact_groups" created or already exists')

    // Create SMS templates table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        variables JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `)
    console.log('Table "sms_templates" created or already exists')

    // Create SMS messages table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        recipient_phone VARCHAR(20) NOT NULL,
        message_content TEXT NOT NULL,
        status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
        scheduled_at TIMESTAMP NULL,
        sent_at TIMESTAMP NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_sent_at (sent_at)
      )
    `)
    console.log('Table "sms_messages" created or already exists')

    // Create SMS campaigns table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sms_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        message_content TEXT NOT NULL,
        target_type ENUM('contacts', 'groups') DEFAULT 'contacts',
        targets JSON,
        status ENUM('draft', 'scheduled', 'sent', 'cancelled') DEFAULT 'draft',
        scheduled_at TIMESTAMP NULL,
        sent_at TIMESTAMP NULL,
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `)
    console.log('Table "sms_campaigns" created or already exists')

    // Add description column if it doesn't exist (for existing databases)
    try {
      await conn.execute(`
        ALTER TABLE sms_campaigns 
        ADD COLUMN description TEXT AFTER name
      `)
      console.log('✅ Added description column to sms_campaigns')
    } catch (error: any) {
      // Column might already exist, ignore error
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Description column already exists in sms_campaigns')
      }
    }

    // Create audit logs table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INT,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('Table "audit_logs" created or already exists')

    // SEED DATABASE DATA
    console.log('\n📝 Seeding database with initial data...')
    
    // Check if admin user already exists
    const [existingAdmin]: any = await conn.execute(
      "SELECT id FROM users WHERE email = ?",
      ['admin@notification.com']
    )

    if (existingAdmin.length === 0) {
      // Create admin user
      await conn.execute(
        'INSERT INTO users (email, password, name, is_admin, is_active) VALUES (?, ?, ?, ?, ?)',
        [
          'admin@notification.com',
          hashPassword('admin123'),
          'Admin User',
          true,
          true,
        ]
      )
      console.log('✅ Admin user created: admin@notification.com / admin123')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Check if demo user already exists
    const [existingDemo]: any = await conn.execute(
      "SELECT id FROM users WHERE email = ?",
      ['demo@notification.com']
    )

    if (existingDemo.length === 0) {
      // Create demo user
      await conn.execute(
        'INSERT INTO users (email, password, name, is_active) VALUES (?, ?, ?, ?)',
        [
          'demo@notification.com',
          hashPassword('demo123'),
          'Demo User',
          true,
        ]
      )
      console.log('✅ Demo user created: demo@notification.com / demo123')
    } else {
      console.log('ℹ️  Demo user already exists')
    }

    console.log('\n✅ Database initialization and seeding completed successfully')
    return true
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    if (conn) {
      await conn.end()
    }
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}
