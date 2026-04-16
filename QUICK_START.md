# Quick Start Guide - SMS Notification System

## Setup Instructions

Follow these steps to get your authentication system up and running:

### Step 1: Configure Your Database Connection

Update `.env.local` with your MySQL credentials:

```bash
# .env.local
MYSQL_HOST=localhost          # Your MySQL server host
MYSQL_PORT=3306              # MySQL port (default: 3306)
MYSQL_USER=root              # Your MySQL username
MYSQL_PASSWORD=your_password # Your MySQL password
MYSQL_DATABASE=notification   # Database name (already created)
```

**Important:** Make sure:
- MySQL server is running
- The database `notification` exists
- You have the correct credentials

### Step 2: Initialize the Database Schema

Run the initialization script to create all tables:

```bash
pnpm db:init
```

You should see output like:
```
✅ Connected to database 'notification'
📋 Creating users table...
📋 Creating contacts table...
📋 Creating contact_groups table...
...
✅ Database initialization completed successfully!
```

### Step 3: Create Test Users (Optional)

Populate the database with test accounts:

```bash
pnpm db:seed
```

Default test credentials (defined in `.env`):
- Admin Email: `admin@sms.local` / Password: `AdminSecurePass2026!`
- Demo Email: `demo@sms.local` / Password: `DemoTestPass2026!`

**Note:** You can change these credentials by editing the `.env` file:
```env
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!
DEMO_EMAIL=your-demo-email@example.com
DEMO_PASSWORD=YourDemoPassword456!
```

### Step 4: Start the Application

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Authentication

### Login
1. Visit http://localhost:3000
2. Click "Login" or navigate to the login page
3. Enter test credentials (from `.env`):
   - Email: `admin@sms.local`
   - Password: `AdminSecurePass2026!`
4. Click Sign In

### Register
1. Click "Register" on the login page
2. Fill in:
   - Email: your-email@example.com
   - Password: new-password
   - Name: Your Name
3. Click Create Account
4. You'll be logged in automatically

## What Was Set Up

✅ **Database Connection**
- MySQL with promise-based driver
- Automatic database pool management
- Environment-based configuration

✅ **Authentication API**
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- Password hashing with PBKDF2 (SHA-512)

✅ **Database Schema**
- 7 tables with proper relationships
- Indexes for performance
- Timestamps for audit trail
- Foreign key constraints

✅ **Auth Context**
- Real backend integration (no mock data)
- Error handling
- LocalStorage persistence
- Loading states

✅ **Commands**
- `pnpm db:init` - Initialize database
- `pnpm db:seed` - Create test users
- `pnpm db:init-and-dev` - Init + start dev server
- `pnpm dev` - Start development server

## Common Issues & Solutions

### "Connection refused" Error
```
Solution: Make sure MySQL is running
macOS: brew services start mysql
Linux: sudo service mysql start
```

### "Database does not exist" Error
```
Solution: Create the notification database first
mysql -u root -p
mysql> CREATE DATABASE notification;
```

### "Access denied" Error
```
Solution: Check your .env.local credentials
Verify username, password, and MySQL user permissions
```

### Tables already exist warning
```
This is normal - the CREATE TABLE IF NOT EXISTS is safe to run multiple times
```

## Next Steps

1. ✅ Complete the setup above
2. Test login/registration with the test credentials
3. Check database tables:
   ```bash
   mysql -u root -p notification
   mysql> SHOW TABLES;
   mysql> SELECT * FROM users;
   ```
4. Explore the dashboard and other features
5. Integrate additional features like:
   - Contact management
   - SMS template creation
   - Campaign scheduling

## API Documentation

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed API documentation.

## Security Reminders

⚠️ **For Development Only:**
- These settings are NOT production-ready
- Never commit `.env.local` to version control
- Change default test passwords immediately in production
- Implement proper JWT authentication for production
- Use HTTPS in production
- Add rate limiting to API endpoints
- Validate all user inputs

---

**Need help?** Check [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed troubleshooting.
