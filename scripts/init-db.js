#!/usr/bin/env node

/**
 * Database initialization script
 * Run this manually with: node scripts/init-db.js
 * Or it will run automatically on app startup if needed
 */

require('dotenv').config({ path: '.env.local' })

const mysql = require('mysql2/promise')

async function initializeDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  }

  let conn

  try {
    console.log('🔄 Connecting to MySQL server...')
    conn = await mysql.createConnection(config)
    const dbName = process.env.MYSQL_DATABASE || 'notification'

    console.log(`📦 Creating database '${dbName}' if it doesn't exist...`)
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)

    await conn.changeUser({ database: dbName })
    console.log(`✅ Connected to database '${dbName}'`)

    // Create users table
    console.log('📋 Creating users table...')
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

    // Create contacts table
    console.log('📋 Creating contacts table...')
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

    // Create contact groups table
    console.log('📋 Creating contact_groups table...')
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

    // Create SMS templates table
    console.log('📋 Creating sms_templates table...')
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

    // Create SMS messages table
    console.log('📋 Creating sms_messages table...')
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

    // Create SMS campaigns table
    console.log('📋 Creating sms_campaigns table...')
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS sms_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        message_content TEXT NOT NULL,
        target_group_id INT,
        status ENUM('draft', 'scheduled', 'sent', 'cancelled') DEFAULT 'draft',
        scheduled_at TIMESTAMP NULL,
        sent_at TIMESTAMP NULL,
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_group_id) REFERENCES contact_groups(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `)

    // Create audit logs table
    console.log('📋 Creating audit_logs table...')
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

    console.log('\n✅ Database initialization completed successfully!')
    console.log(`Database: ${dbName}`)
    console.log('Tables created:')
    console.log('  - users')
    console.log('  - contacts')
    console.log('  - contact_groups')
    console.log('  - sms_templates')
    console.log('  - sms_messages')
    console.log('  - sms_campaigns')
    console.log('  - audit_logs')
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    process.exit(1)
  } finally {
    if (conn) {
      await conn.end()
    }
  }
}

initializeDatabase()
