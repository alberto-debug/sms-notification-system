#!/usr/bin/env node

/**
 * Database seeding script - Creates test users
 * Run with: node scripts/seed-db.js
 */

require('dotenv').config({ path: '.env.local' })

const mysql = require('mysql2/promise')
const crypto = require('crypto')

function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, 'salt', 1000, 64, 'sha512')
    .toString('hex')
}

async function seedDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'notification',
  }

  let conn

  try {
    console.log('🔄 Connecting to database...')
    conn = await mysql.createConnection(config)
    console.log('✅ Connected successfully')

    // Check if test users already exist
    const [existingUsers] = await conn.execute(
      "SELECT id FROM users WHERE email IN ('admin@notification.com', 'demo@notification.com')"
    )

    if (existingUsers.length > 0) {
      console.log('ℹ️  Test users already exist, skipping seeding...')
      return
    }

    console.log('📝 Creating test users...')

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

    console.log('\n✅ Database seeding completed!')
    console.log('\nTest Credentials:')
    console.log('  Admin:')
    console.log('    Email: admin@notification.com')
    console.log('    Password: admin123')
    console.log('  Demo:')
    console.log('    Email: demo@notification.com')
    console.log('    Password: demo123')
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  } finally {
    if (conn) {
      await conn.end()
    }
  }
}

seedDatabase()
