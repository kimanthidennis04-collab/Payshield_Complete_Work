# PayShield - Business Financial Operating Platform

PayShield is a comprehensive B2B SaaS financial operating platform designed for businesses to manage invoicing, payments, expenses, cash flow, and business intelligence.

## Features

### Core Functionality
- **Organization Management**: Multi-tenant architecture with complete organization isolation
- **User Management**: Role-based access control (Owner, Admin, Finance, Accountant, Staff)
- **Client Management**: Complete CRUD with contact information and transaction history
- **Service Management**: Define reusable services for quotes and invoices
- **Quote Management**: Create, send, track, and convert quotes to invoices
- **Invoice Management**: Full invoice lifecycle with automatic status updates
- **Payment Recording**: Track payments with automatic invoice balance updates
- **Expense Management**: Track and categorize business expenses
- **Cash Flow Dashboard**: Real-time cash flow visibility
- **Business Reports**: Revenue, payments, outstanding invoices, expenses, client balances
- **AI Business Insights**: Automated analysis of business financial health
- **Audit Logging**: Complete audit trail of all important actions

### Architecture Prepared For
- M-Pesa and mobile money integration
- Bank API integration
- Card processing (Stripe, etc.)
- Payment links and webhooks
- Multi-currency support
- Multi-country expansion
- AI-powered business intelligence
- Invoice financing marketplace
- Business services marketplace
- Developer API platform

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production-ready)
- **Authentication**: JWT with bcrypt password hashing
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Security**: Helmet, CORS, rate limiting, input validation

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. (Optional) Seed demo data:
```bash
npm run prisma:seed
```

Demo credentials:
- Email: demo@payshield.com
- Password: demo123

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- Authentication (signup, login, token validation)
- Organization isolation (data security between organizations)
- API endpoints

## Database Management

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Run Migrations
```bash
npm run prisma:migrate
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

### Reset Database
```bash
npm run prisma:reset
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client details
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `GET /api/services/:id` - Get service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `GET /api/quotes/:id` - Get quote
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote
- `POST /api/quotes/:id/convert-to-invoice` - Convert to invoice

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/:id` - Get payment

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard metrics
- `GET /api/dashboard/cashflow` - Get cash flow data

### Reports
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/payments` - Payments report
- `GET /api/reports/outstanding-invoices` - Outstanding invoices
- `GET /api/reports/overdue-invoices` - Overdue invoices
- `GET /api/reports/expenses` - Expenses report
- `GET /api/reports/client-balances` - Client balances
- `GET /api/reports/transaction-history` - Transaction history

### AI Insights
- `GET /api/insights` - List insights
- `POST /api/insights/generate` - Generate new insights

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Organization-level data isolation
- Rate limiting on API endpoints
- CORS configuration
- Helmet security headers
- Input validation
- SQL injection prevention via Prisma ORM

## Deployment

### Environment Variables Required for Production

```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/payshield
JWT_SECRET=strong-production-secret
```

### Payment Provider Integration (Optional)

For M-Pesa:
```
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
```

For Card Processing:
```
STRIPE_SECRET_KEY=your_key
STRIPE_PUBLISHABLE_KEY=your_key
```

For AI Provider:
```
AI_PROVIDER_KEY=your_key
AI_PROVIDER_ENDPOINT=your_endpoint
```

### Deployment Steps

1. Set up a PostgreSQL database
2. Configure environment variables
3. Run database migrations:
```bash
npx prisma migrate deploy
```
4. Generate Prisma Client:
```bash
npx prisma generate
```
5. Start the application:
```bash
npm start
```

### Render Deployment Example

1. Push code to GitHub
2. Create new PostgreSQL database on Render
3. Create new web service on Render
4. Add environment variables
5. Deploy

Build command: `npm install && npx prisma generate`
Start command: `npm start`

## Architecture

### Backend Structure
```
server/
├── config/        # Database configuration
├── controllers/   # Request handlers
├── middleware/    # Authentication, validation
├── routes/        # API route definitions
├── services/      # Business logic layer
└── utils/         # Utility functions
```

### Frontend Structure
```
public/
├── css/           # Stylesheets
├── js/            # Client-side JavaScript
└── pages/         # HTML pages
```

## Multi-Currency Support

Supported currencies:
- USD (US Dollar)
- KES (Kenyan Shilling)
- UGX (Ugandan Shilling)
- TZS (Tanzanian Shilling)
- RWF (Rwandan Franc)
- GBP (British Pound)
- EUR (Euro)

Each organization can set its primary currency.

## Organization Isolation

PayShield implements strict organization isolation:
- All business records are associated with an organization
- Users can only access their own organization's data
- Database queries automatically filter by organization
- API endpoints enforce organization ownership
- No frontend-only security

## License

ISC

## Support

For support, visit https://devin.ai/support
