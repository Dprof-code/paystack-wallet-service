# Paystack Wallet Service API

A comprehensive backend wallet service built with Express + Node.js + TypeScript, featuring Google OAuth authentication, Paystack payment integration, API key management for service-to-service access, and complete wallet operations.

## 🎯 Features

### 🔐 Authentication & Authorization

- **Google Sign-In (OAuth 2.0)**: Secure server-side authentication flow
- **JWT Token Generation**: 7-day expiry tokens for user sessions
- **Dual Authentication Support**: JWT tokens OR API keys for flexibility
- **API Key Management**: Service-to-service authentication with granular permissions
- **Permission-Based Access Control**: Separate permissions for deposit, transfer, and read operations

### 💰 Wallet System

- **Automatic Wallet Creation**: Each user gets a unique 13-digit wallet number on signup
- **Wallet Balance Management**: Real-time balance tracking in kobo (NGN smallest unit)
- **Wallet-to-Wallet Transfers**: Send money between users instantly
- **Transaction History**: Complete audit trail of all deposits and transfers
- **Balance Inquiry**: Check wallet balance anytime

### 💳 Payment Processing

- **Paystack Integration**: Seamless deposit initialization with payment links
- **Webhook Handler**: Real-time payment status updates from Paystack (mandatory)
- **Transaction Verification**: Manual transaction status checks as fallback
- **Idempotency**: Prevent duplicate transactions with unique references
- **Webhook Signature Verification**: Secure payload validation

### 🔑 API Key System

- **Key Generation**: Create API keys with custom permissions and expiry
- **Maximum 5 Active Keys**: Enforced limit per user for security
- **Flexible Expiry Options**: 1H, 1D, 1M, or 1Y expiration periods
- **Key Rollover**: Regenerate expired keys with same permissions
- **Permission Types**:
  - `deposit` - Initialize Paystack deposits
  - `transfer` - Transfer funds between wallets
  - `read` - View balance and transaction history
- **Automatic Expiry Checking**: Keys are validated on every request
- **Key Revocation**: Manual revocation support

### 📊 Database & Models

- **MongoDB Integration**: Scalable NoSQL database
- **User Management**: Store Google profile info and link to wallets
- **Wallet Model**: Unique wallet numbers with balance tracking
- **Transaction Records**: Complete transaction history with timestamps
- **API Key Storage**: Hashed keys with expiry and permissions

### 🛡️ Security Features

- **JWT Secret Protection**: Secure token signing
- **API Key Hashing**: SHA256 hashing (never store plain keys)
- **Webhook Signature Verification**: HMAC-SHA512 validation
- **Environment Variable Configuration**: Sensitive data protection
- **Permission Validation**: Every API key request checked for proper permissions
- **Expired Key Rejection**: Automatic validation on every request

### 📚 API Documentation

- **Interactive Swagger UI**: Full API documentation at `/api-docs`
- **OpenAPI 3.0 Specification**: Industry-standard API documentation
- **Try It Out Feature**: Test endpoints directly from the browser
- **Authentication Examples**: JWT and API key usage demonstrations
- **Request/Response Schemas**: Detailed payload examples

### 🔧 Developer Experience

- **TypeScript**: Full type safety and IntelliSense support
- **Hot Reload**: Development mode with ts-node-dev
- **Error Handling**: Comprehensive error messages and status codes
- **Request Logging**: Track all API requests with timestamps
- **Health Check Endpoint**: Monitor service status
- **Production Ready**: Build and deployment scripts included

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (running locally or a remote connection string)
- **Google OAuth 2.0 Credentials**
- **Paystack Account** with API keys

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd google-signin-paystack-payment
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/google-paystack-auth

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# Application Configuration
APP_BASE_URL=http://localhost:3000
FRONTEND_SUCCESS_URL=http://localhost:3000/payment-success
```

### 3. Get Your API Credentials

#### Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Select **Web application**
6. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
7. Copy your **Client ID** and **Client Secret**

#### Paystack API Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to **Settings** > **API Keys & Webhooks**
3. Copy your **Secret Key** (use test key for development)
4. Set up a webhook URL: `http://your-domain.com/payments/paystack/webhook`
5. Copy the webhook secret for signature verification

### 4. Run the Application

**Development mode** (with hot reload):

```bash
npm run dev
```

**Production build**:

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Interactive Documentation

Visit **`http://localhost:3000/api-docs`** for the complete interactive Swagger API documentation.

The Swagger UI provides:

- ✅ Complete endpoint documentation
- ✅ Request/response schemas
- ✅ Try-it-out functionality
- ✅ Authentication examples
- ✅ Error response details

### Base URL

```
http://localhost:3000
```

### Quick Overview of Endpoints

#### 🔐 Authentication

- `GET /auth/google` - Initiate Google OAuth sign-in
- `GET /auth/google/callback` - OAuth callback handler

#### 🔑 API Key Management (Requires JWT)

- `POST /keys/create` - Generate new API key
- `POST /keys/rollover` - Rollover expired API key

#### 💰 Wallet Operations

- `POST /wallet/deposit` - Initialize Paystack deposit (requires JWT or API key with `deposit` permission)
- `POST /wallet/paystack/webhook` - Paystack webhook handler (public)
- `GET /wallet/deposit/:reference/status` - Check transaction status (requires JWT or API key with `read` permission)
- `GET /wallet/balance` - Get wallet balance (requires JWT or API key with `read` permission)
- `POST /wallet/transfer` - Transfer funds to another wallet (requires JWT or API key with `transfer` permission)
- `GET /wallet/transactions` - Get transaction history (requires JWT or API key with `read` permission)

---

## 🔐 Authentication Methods

### Method 1: JWT Token (User Authentication)

1. **Sign in with Google** to get a JWT token:

```bash
# Step 1: Get Google auth URL
curl http://localhost:3000/auth/google?json=true

# Step 2: Visit the URL in browser and complete OAuth
# Step 3: You'll receive a response with a JWT token
```

2. **Use the JWT token** in subsequent requests:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/wallet/balance
```

### Method 2: API Key (Service-to-Service)

1. **Create an API key** (requires JWT first):

```bash
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service",
    "permissions": ["deposit", "read"],
    "expiry": "1M"
  }'
```

Response:

```json
{
  "api_key": "sk_live_abc123def456...",
  "expires_at": "2025-02-10T12:00:00Z"
}
```

2. **Use the API key** in subsequent requests:

```bash
curl -H "x-api-key: sk_live_abc123def456..." \
     http://localhost:3000/wallet/balance
```

---

## 💡 Usage Examples

### Complete User Flow

#### 1. User Sign Up & Get Wallet

```bash
# Visit Google OAuth URL
curl http://localhost:3000/auth/google?json=true

# Complete OAuth in browser, receive:
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "wallet": "4566678954356",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Deposit Money via Paystack

```bash
# Initialize deposit
curl -X POST http://localhost:3000/wallet/deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'

# Response:
{
  "reference": "PS_1701875234567_ABC123",
  "authorization_url": "https://checkout.paystack.com/xyz123"
}

# User completes payment on Paystack
# Webhook automatically updates wallet balance
```

#### 3. Check Wallet Balance

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/wallet/balance

# Response:
{
  "balance": 5000
}
```

#### 4. Transfer to Another Wallet

```bash
curl -X POST http://localhost:3000/wallet/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_number": "7890123456789",
    "amount": 2000
  }'

# Response:
{
  "status": "success",
  "message": "Transfer completed"
}
```

#### 5. View Transaction History

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/wallet/transactions

# Response:
{
  "transactions": [
    {
      "reference": "PS_1701875234567_ABC123",
      "amount": 5000,
      "type": "deposit",
      "status": "success",
      "createdAt": "2025-12-10T10:30:00.000Z"
    },
    {
      "reference": "PS_1701875234568_DEF456",
      "amount": 2000,
      "type": "transfer",
      "status": "success",
      "senderId": "507f1f77bcf86cd799439011",
      "receiverId": "507f1f77bcf86cd799439012",
      "createdAt": "2025-12-10T11:00:00.000Z"
    }
  ]
}
```

---

### Service-to-Service API Key Flow

#### 1. Create API Key with Specific Permissions

```bash
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "reporting-service",
    "permissions": ["read"],
    "expiry": "1Y"
  }'

# Response:
{
  "api_key": "sk_live_a1b2c3d4e5f6...",
  "expires_at": "2026-12-10T12:00:00Z"
}
```

#### 2. Use API Key to Access Wallet

```bash
# Check balance using API key
curl -H "x-api-key: sk_live_a1b2c3d4e5f6..." \
     http://localhost:3000/wallet/balance

# Get transactions using API key
curl -H "x-api-key: sk_live_a1b2c3d4e5f6..." \
     http://localhost:3000/wallet/transactions
```

#### 3. Rollover Expired Key

```bash
curl -X POST http://localhost:3000/keys/rollover \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expired_key_id": "sk_live_old_expired_key...",
    "expiry": "1Y"
  }'

# Response: New key with same permissions
{
  "api_key": "sk_live_new_key_xyz789...",
  "expires_at": "2026-12-10T12:00:00Z"
}
```

---

## 🔧 API Key Permissions

### Permission Types

| Permission | Description                    | Allowed Endpoints                                                                              |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `deposit`  | Initialize Paystack deposits   | `POST /wallet/deposit`                                                                         |
| `transfer` | Transfer funds between wallets | `POST /wallet/transfer`                                                                        |
| `read`     | View balance and transactions  | `GET /wallet/balance`<br>`GET /wallet/transactions`<br>`GET /wallet/deposit/:reference/status` |

### Permission Rules

- **JWT tokens** have full access to all endpoints
- **API keys** only have access based on granted permissions
- Multiple permissions can be combined: `["deposit", "transfer", "read"]`
- Maximum **5 active API keys** per user
- Keys automatically expire based on configured time

### Expiry Options

- `1H` - 1 Hour
- `1D` - 1 Day
- `1M` - 1 Month (30 days)
- `1Y` - 1 Year (365 days)

---

## 🔄 Paystack Webhook Integration

### Webhook Setup

1. **Configure webhook URL** in Paystack Dashboard:

   ```
   https://your-domain.com/wallet/paystack/webhook
   ```

2. **Copy webhook secret** from Paystack Dashboard

3. **Add to `.env` file**:
   ```env
   PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### How It Works

1. User completes payment on Paystack
2. Paystack sends webhook event to your server
3. Server verifies webhook signature (HMAC-SHA512)
4. Server updates transaction status
5. Server credits wallet balance (only on `charge.success` event)

### Supported Events

- `charge.success` - Payment successful (wallet credited)

### Security

- HMAC-SHA512 signature verification on every webhook
- Payload validation before processing
- Idempotent transaction updates (no double-crediting)

---

## 🗄️ Database Models

### User Model

```typescript
{
  _id: ObjectId,
  googleId: string,        // Unique Google user ID
  email: string,           // User email (unique, indexed)
  name: string,            // User full name
  picture?: string,        // Profile picture URL
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### Wallet Model

```typescript
{
  _id: ObjectId,
  walletNumber: string,    // 13-digit unique wallet number (indexed)
  balance: number,         // Balance in kobo (min: 0)
  userId: ObjectId,        // Reference to User (unique, indexed)
  createdAt: Date,         // Auto-generated
  updatedAt: Date          // Auto-generated
}
```

### Transaction Model

```typescript
{
  _id: ObjectId,
  reference: string,                          // Unique transaction reference (indexed)
  amount: number,                             // Amount in kobo
  type: 'deposit' | 'transfer',              // Transaction type
  status: 'pending' | 'success' | 'failed',  // Transaction status
  paystackAuthorizationUrl?: string,         // Paystack checkout URL
  userId?: ObjectId,                         // User ID (for deposits)
  senderId?: ObjectId,                       // Sender ID (for transfers)
  receiverId?: ObjectId,                     // Receiver ID (for transfers)
  paidAt?: Date,                             // Payment completion timestamp
  createdAt: Date,                           // Auto-generated
  updatedAt: Date                            // Auto-generated
}
```

### API Key Model

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                          // Reference to User (indexed)
  keyHash: string,                           // SHA256 hash of API key (unique, indexed)
  name: string,                              // Friendly name
  permissions: ['deposit'|'transfer'|'read'], // Array of permissions
  expiresAt: Date,                           // Expiration timestamp (indexed)
  isRevoked: boolean,                        // Manual revocation flag
  createdAt: Date,                           // Auto-generated
  updatedAt: Date                            // Auto-generated
}
```

---

## 🔒 Security Best Practices

### Implemented Security Features

✅ **Environment Variables** - Sensitive data in `.env` file
✅ **JWT Secret Protection** - Secure token signing and verification
✅ **API Key Hashing** - SHA256 hashing (plain keys never stored)
✅ **Webhook Signature Verification** - HMAC-SHA512 validation
✅ **Permission-Based Access** - Granular control over API key permissions
✅ **Automatic Key Expiry** - Time-based key invalidation
✅ **Rate Limiting Support** - Request logging for monitoring
✅ **Input Validation** - Type checking and required field validation
✅ **Error Handling** - Comprehensive error messages without leaking sensitive info

### Production Recommendations

1. **Use HTTPS** - Always use HTTPS in production
2. **Set Strong JWT Secret** - Use a long, random secret key
3. **Configure CORS** - Restrict to your frontend domain only
4. **Enable Rate Limiting** - Protect against abuse
5. **Monitor Logs** - Track failed authentication attempts
6. **Database Security** - Use MongoDB authentication and connection string encryption
7. **Regular Key Rotation** - Encourage users to rotate API keys periodically
8. **Webhook IP Whitelisting** - Restrict webhook endpoint to Paystack IPs

---

## 🚀 Deployment

### Environment Configuration

Update `.env` for production:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/walletdb
GOOGLE_CLIENT_ID=production_client_id
GOOGLE_CLIENT_SECRET=production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
PAYSTACK_SECRET_KEY=sk_live_your_production_key
PAYSTACK_WEBHOOK_SECRET=your_production_webhook_secret
APP_BASE_URL=https://yourdomain.com
JWT_SECRET=your-super-strong-production-secret-key
```

### Build and Run

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📊 Project Structure

```
paystack-wallet-service/
├── src/
│   ├── config/
│   │   ├── index.ts              # Environment configuration
│   │   ├── database.ts           # MongoDB connection
│   │   └── swagger.ts            # Swagger/OpenAPI configuration
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT & API key authentication
│   │   └── errorHandler.ts      # Global error handling
│   ├── models/
│   │   ├── User.ts               # User schema
│   │   ├── Wallet.ts             # Wallet schema
│   │   ├── Transaction.ts        # Transaction schema
│   │   └── Key.ts                # API Key schema
│   ├── routes/
│   │   ├── auth.routes.ts        # Google OAuth endpoints
│   │   ├── wallet.routes.ts      # Wallet operations endpoints
│   │   └── key.routes.ts         # API key management endpoints
│   ├── services/
│   │   ├── googleAuth.service.ts # Google OAuth logic
│   │   ├── wallet.service.ts     # Paystack integration
│   │   └── key.service.ts        # API key generation logic
│   └── index.ts                  # Application entry point
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # This file
└── SWAGGER_SETUP.md              # Swagger documentation guide
```

---

## 🧪 Testing

### Manual Testing with cURL

See the [Usage Examples](#-usage-examples) section above for complete cURL examples.

### Testing with Swagger UI

1. Start the server: `npm run dev`
2. Visit: `http://localhost:3000/api-docs`
3. Click "Authorize" and add your JWT token or API key
4. Try out endpoints directly from the browser

### Postman Collection

Import the Swagger spec into Postman:

1. Open Postman
2. Import > Link
3. Enter: `http://localhost:3000/api-docs/swagger.json`

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**

```
Error: MongoDB connection error
```

**Solution**: Verify `MONGODB_URI` in `.env` and ensure MongoDB is running

**Google OAuth Error**

```
Error: invalid_client
```

**Solution**: Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI matches Google Console

**Paystack Initialization Failed**

```
Error: Paystack initialization failed
```

**Solution**: Verify `PAYSTACK_SECRET_KEY` is correct and starts with `sk_test_` or `sk_live_`

**Webhook Signature Invalid**

```
Error: Invalid webhook signature
```

**Solution**: Ensure `PAYSTACK_WEBHOOK_SECRET` matches the secret in your Paystack Dashboard

**API Key Expired**

```
Error: Invalid or expired API key
```

**Solution**: Use the `/keys/rollover` endpoint to generate a new key

---

## 📝 License

MIT

---

## 👨‍💻 Author

Built by [Dprof](https://prodevx.site) for HNG Backend Track Stage 8

---

## 🔗 Useful Links

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Paystack API Documentation](https://paystack.com/docs/api/)
- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)

---

## ✨ Features Checklist

- ✅ Google OAuth 2.0 Authentication
- ✅ JWT Token Generation (7-day expiry)
- ✅ Automatic Wallet Creation on Signup
- ✅ Paystack Deposit Integration
- ✅ Paystack Webhook Handler (Mandatory)
- ✅ Wallet Balance Management
- ✅ Wallet-to-Wallet Transfers
- ✅ Transaction History
- ✅ API Key Generation with Permissions
- ✅ API Key Expiry System (1H, 1D, 1M, 1Y)
- ✅ API Key Rollover
- ✅ Maximum 5 Active Keys Per User
- ✅ Permission-Based Access Control
- ✅ Interactive Swagger API Documentation
- ✅ Request Logging
- ✅ Comprehensive Error Handling
- ✅ TypeScript Support
- ✅ MongoDB Integration
