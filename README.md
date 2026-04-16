# SMS Notification System

A centralized SMS platform designed for Africa Nazarene University to manage mass SMS communications effortlessly.

## Features

- **User Management** - Create and manage user accounts with role-based access (admin & regular users)
- **Contact Management** - Organize contacts into groups for targeted messaging
- **SMS Templates** - Build reusable message templates with variable substitution
- **Message Scheduling** - Schedule SMS delivery for specific dates and times
- **Campaign Management** - Create and track SMS campaigns across multiple recipients
- **Delivery Reports** - Monitor message status and delivery metrics
- **Africa's Talking Integration** - Direct integration with Africa's Talking messaging provider
- **Dashboard** - Real-time overview of sent messages, delivery status, and performance metrics

## Prerequisites

Before you get started, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **pnpm** package manager
- **MySQL** database server (v5.7+)
- **Africa's Talking** account (for SMS sending - sign up at [africastalking.com](https://africastalking.com))

## Installation

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd sms-notification-system
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with your database and API credentials:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=notification

# Africa's Talking API
AFRICAS_TALKING_API_KEY=your_api_key_here
AFRICAS_TALKING_USERNAME=your_username
AFRICAS_TALKING_SENDER_ID=ANU

# Default Test Credentials (change these!)
ADMIN_EMAIL=admin@sms.local
ADMIN_PASSWORD=AdminSecurePass2026!
DEMO_EMAIL=demo@sms.local
DEMO_PASSWORD=DemoTestPass2026!
```

**Getting Africa's Talking Credentials:**
1. Sign up at [africastalking.com](https://africastalking.com)
2. Navigate to API Settings
3. Copy your API Key and Username
4. Use the sandbox environment for testing

### 3. Initialize Database

```bash
pnpm db:init
```

This will create all necessary tables automatically. You should see a success message when complete.

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## First Time Setup

### Login with Test Credentials

On first load, use these credentials (defined in `.env`):
- **Email:** admin@sms.local
- **Password:** AdminSecurePass2026!

### Change Default Credentials

To use different credentials, edit `.env` before initializing:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourOwnPassword123!
DEMO_EMAIL=another-email@example.com
DEMO_PASSWORD=AnotherPassword456!
```

Then run:
```bash
pnpm db:init
```

## Project Structure

```
sms-notification-system/
├── app/                          # Next.js app directory
│   ├── api/                      # Backend API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── contacts/             # Contact management
│   │   ├── contact-groups/       # Contact groups
│   │   ├── templates/            # SMS templates
│   │   ├── messages/             # Message operations
│   │   ├── campaigns/            # Campaign management
│   │   ├── dashboard/            # Dashboard stats
│   │   └── africas-talking/      # SMS provider integration
│   ├── (main)/                   # Main app layout and pages
│   ├── (lecturer)/               # Lecturer section (optional)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # UI component library
│   ├── login.tsx                 # Login component
│   ├── dashboard.tsx             # Dashboard component
│   ├── contacts.tsx              # Contacts management
│   ├── templates.tsx             # Templates management
│   ├── composer.tsx              # Message composer
│   ├── scheduler.tsx             # Schedule messages
│   ├── reporting.tsx             # Reports and analytics
│   └── sidebar.tsx               # Navigation sidebar
├── context/                      # React context providers
│   └── auth.tsx                  # Authentication context
├── hooks/                        # Custom React hooks
│   ├── use-api.ts                # API call hooks
│   ├── use-toast.ts              # Toast notifications
│   └── use-mobile.ts             # Mobile detection
├── lib/                          # Utility functions and helpers
│   ├── db.ts                     # Database connection
│   ├── db-init.ts                # Database initialization
│   ├── server-init.ts            # Server setup
│   ├── scheduler.ts              # Message scheduler
│   ├── africas-talking.ts        # SMS provider integration
│   ├── pdf-export.ts             # PDF report generation
│   ├── message-variables.ts      # Template variable handling
│   └── utils.ts                  # General utilities
├── migrations/                   # Database migrations (if needed)
├── scripts/                      # Automation scripts
│   └── init-db.js                # Database initialization script
├── public/                       # Static assets
├── types/                        # TypeScript type definitions
├── .env                          # Environment configuration
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
└── README.md                     # This file
```

## Database Schema

The system uses 6 main tables:

- **users** - User accounts and authentication
- **contacts** - Individual contact information
- **contact_groups** - Grouped contacts for bulk messaging
- **sms_templates** - Message templates with variables
- **sms_messages** - Individual SMS records and delivery status
- **sms_campaigns** - Bulk message campaigns

All tables include proper indexes, foreign keys, and timestamps for optimal performance and audit trails.

## Common Tasks

### Send a Single Message

1. Go to **Composer**
2. Add recipient phone number
3. Type or select a template
4. Click Send

### Create a Contact Group

1. Go to **Contacts**
2. Click "Add Group"
3. Enter group name and description
4. Add contacts to the group
5. Save

### Schedule Messages

1. Go to **Scheduler**
2. Create a new schedule
3. Select recipients (individual or group)
4. Choose message template
5. Set delivery date and time
6. Confirm

### Generate Reports

1. Go to **Reports**
2. Use filters to narrow results (date, status, etc.)
3. View statistics and charts
4. Export to PDF if needed

## Troubleshooting

### Database Connection Issues

If you get "Connection refused":

1. Verify MySQL is running:
   - **macOS:** `brew services start mysql`
   - **Linux:** `sudo service mysql start`
   - **Windows:** Use Task Manager to check MySQL service

2. Check credentials in `.env` file match your MySQL setup

3. Verify database exists:
   ```bash
   mysql -u root -p
   mysql> SHOW DATABASES;
   ```



### "Database does not exist" Error

Create the database first:
```bash
mysql -u root -p
mysql> CREATE DATABASE notification;
mysql> EXIT;
```

Then run initialization:
```bash
pnpm db:init
```

### Login Not Working

1. Verify you're using correct credentials from `.env`
2. Check database has user records:
   ```bash
   mysql -u root -p notification
   mysql> SELECT email FROM users;
   ```
3. Try clearing browser cookies and cache
4. Restart the development server

### SMS Not Sending

1. Verify Africa's Talking API credentials in `.env`
2. Check recipient phone numbers are valid (should include country code)
3. For sandbox, check test credits are available
4. Review API error logs in console

### Port Already in Use

If port 3000 is busy, use:
```bash
pnpm dev -- -p 3001
```

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:init          # Initialize database schema
pnpm db:init-and-dev  # Initialize DB and start dev server

# Code Quality
pnpm lint             # Run ESLint
```

## Technology Stack

- **Frontend:** React 19, Next.js 16, TypeScript
- **UI Framework:** Tailwind CSS, Radix UI Components
- **State Management:** React Context API
- **Database:** MySQL with promise-based driver
- **API:** Next.js API Routes
- **SMS Provider:** Africa's Talking
- **Notifications:** Sonner Toast Library
- **Charts:** Recharts for analytics
- **PDF Export:** jsPDF for report generation
- **Styling:** Tailwind CSS with PostCSS

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Docker

Build and run with Docker:
```bash
docker build -t sms-notification .
docker run -p 3000:3000 --env-file .env sms-notification
```

### Manual Server

1. Install Node.js and MySQL on server
2. Clone repository
3. Configure `.env` with production credentials
4. Run `pnpm install && pnpm build`
5. Start with `pnpm start`
6. Use process manager like PM2 to keep it running

## Security Considerations

- Never commit `.env` file with real credentials
- Change default test passwords immediately in production
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Validate all user inputs on both client and server
- Regularly update dependencies
- Use environment-specific configurations
- Implement proper JWT token expiration
- Add CORS headers appropriately

## Contributing

When contributing to this project:

1. Create a feature branch
2. Make your changes with clear commit messages
3. Test thoroughly before submitting
4. Update relevant documentation
5. Submit a pull request with description

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review error messages in browser console and server logs
3. Verify all configuration settings
4. Create an issue with detailed error information

## License

This project is developed for Africa Nazarene University.

---

**Last Updated:** April 2026  
**Version:** 1.0.0
