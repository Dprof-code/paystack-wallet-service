# Google Sign-In & Paystack Payment API

A backend-only Express + Node.js + TypeScript application that implements Google OAuth 2.0 authentication and Paystack payment integration with secure, well-defined API endpoints.

## 🎯 Features

- **Google Sign-In (OAuth 2.0)**: Server-side authentication flow
- **Paystack Payment Integration**: Initialize payments and verify transactions
- **Webhook Support**: Real-time payment status updates from Paystack
- **MongoDB Database**: Store users and transactions
- **TypeScript**: Full type safety and IntelliSense
- **Security**: Webhook signature verification and environment variable configuration
- **Idempotency**: Prevent duplicate transaction creation

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

### Base URL

```
http://localhost:3000
```

### Authentication Endpoints

#### 1. Trigger Google Sign-In

**Endpoint**: `GET /auth/google`

**Description**: Initiates Google OAuth 2.0 flow

**Query Parameters**:

- `json` (optional): Set to `true` to receive JSON response instead of redirect

**Response** (with `?json=true`):

```json
{
  "google_auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Response** (without query parameter):

- `302 Redirect` to Google OAuth consent page

**Error Responses**:

- `400`: Invalid redirect configuration
- `500`: Internal server error

**Example**:

```bash
curl http://localhost:3000/auth/google?json=true
```

---

#### 2. Google OAuth Callback

**Endpoint**: `GET /auth/google/callback`

**Description**: Handles Google OAuth callback, exchanges code for user info, and creates/updates user

**Query Parameters**:

- `code` (required): Authorization code from Google
- `error` (optional): Error if user denied access

**Success Response** (200):

```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

**Error Responses**:

- `400`: Missing or invalid authorization code
- `401`: Invalid or expired authorization code
- `500`: Provider error or database error

**Flow**:

1. Google redirects to this endpoint with authorization code
2. Server exchanges code for access token
3. Server fetches user info from Google
4. Server creates or updates user in database
5. Returns user information

---

### Payment Endpoints

#### 3. Initiate Paystack Payment

**Endpoint**: `POST /payments/paystack/initiate`

**Description**: Initialize a new payment transaction with Paystack

**Request Body**:

```json
{
  "amount": 5000,
  "email": "customer@example.com",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Fields**:

- `amount` (required): Amount in kobo (smallest currency unit). Example: 5000 = ₦50.00
- `email` (optional): Customer email address
- `user_id` (optional): User ID to associate with transaction

**Success Response** (201):

```json
{
  "reference": "PS_1701875234567_ABC123",
  "authorization_url": "https://checkout.paystack.com/xyz123"
}
```

**Error Responses**:

- `400`: Invalid input (amount must be positive number)
- `402`: Payment initiation failed by Paystack
- `500`: Database or internal error

**Idempotency**:
If a transaction with the same reference exists, returns existing transaction instead of creating a new one.

**Example**:

```bash
curl -X POST http://localhost:3000/payments/paystack/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "email": "test@example.com"}'
```

---

#### 4. Paystack Webhook

**Endpoint**: `POST /payments/paystack/webhook`

**Description**: Receives real-time updates from Paystack when payment status changes

**Headers**:

- `x-paystack-signature` (required): HMAC SHA512 signature for verification

**Request Body** (example):

```json
{
  "event": "charge.success",
  "data": {
    "reference": "PS_1701875234567_ABC123",
    "status": "success",
    "amount": 5000,
    "paid_at": "2025-12-06T10:30:00.000Z"
  }
}
```

**Success Response** (200):

```json
{
  "status": true
}
```

**Error Responses**:

- `400`: Missing signature or invalid signature
- `500`: Internal error

**Security**:

- Verifies webhook signature using HMAC SHA512
- Only processes events with valid signatures
- Updates transaction status in database

**Setup**:
Configure webhook URL in Paystack dashboard: `https://your-domain.com/payments/paystack/webhook`

---

#### 5. Check Transaction Status

**Endpoint**: `GET /payments/:reference/status`

**Description**: Retrieve the current status of a transaction

**Path Parameters**:

- `reference` (required): Transaction reference

**Query Parameters**:

- `refresh` (optional): Set to `true` to fetch live status from Paystack

**Success Response** (200):

```json
{
  "reference": "PS_1701875234567_ABC123",
  "status": "success",
  "amount": 5000,
  "paid_at": "2025-12-06T10:30:00.000Z"
}
```

**Status Values**:

- `pending`: Payment not yet completed
- `success`: Payment successful
- `failed`: Payment failed

**Error Responses**:

- `400`: Invalid request (missing reference)
- `404`: Transaction not found
- `500`: Internal error

**Behavior**:

- Returns cached status from database by default
- If `refresh=true` or status is `pending`, fetches live status from Paystack
- Updates database with latest status

**Examples**:

```bash
# Get cached status
curl http://localhost:3000/payments/PS_1701875234567_ABC123/status

# Get live status from Paystack
curl http://localhost:3000/payments/PS_1701875234567_ABC123/status?refresh=true
```

---

## 🗄️ Database Schema

### User Collection

```typescript
{
  googleId: string;      // Unique Google user ID
  email: string;         // User email (unique)
  name: string;          // User full name
  picture?: string;      // Profile picture URL
  createdAt: Date;       // Auto-generated
  updatedAt: Date;       // Auto-generated
}
```

### Transaction Collection

```typescript
{
  reference: string;                // Unique transaction reference
  amount: number;                   // Amount in kobo
  status: 'pending' | 'success' | 'failed';
  paystackAuthorizationUrl?: string; // Checkout URL
  userId?: string;                  // Associated user ID
  paidAt?: Date;                    // Payment completion timestamp
  createdAt: Date;                  // Auto-generated
  updatedAt: Date;                  // Auto-generated
}
```

---

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Secret Keys**: Keep Google and Paystack secrets secure
3. **Webhook Verification**: All webhook requests are verified using HMAC SHA512
4. **HTTPS in Production**: Always use HTTPS for production deployments
5. **CORS Configuration**: Configure CORS based on your frontend domain
6. **Rate Limiting**: Consider adding rate limiting for production

---

## 🔄 Complete Flow Examples

### Google Sign-In Flow

1. **User initiates sign-in**:

   ```
   GET /auth/google
   → Redirects to Google consent page
   ```

2. **User authorizes on Google**:

   ```
   Google redirects to: /auth/google/callback?code=xyz123
   ```

3. **Server processes callback**:
   - Exchanges code for access token
   - Fetches user info from Google
   - Creates/updates user in database
   - Returns user information

### Paystack Payment Flow

1. **Initialize payment**:

   ```bash
   POST /payments/paystack/initiate
   Body: { "amount": 5000, "email": "user@example.com" }

   Response: {
     "reference": "PS_123",
     "authorization_url": "https://checkout.paystack.com/..."
   }
   ```

2. **User completes payment**:

   - Redirect user to `authorization_url`
   - User enters card details on Paystack
   - Paystack processes payment

3. **Receive webhook** (automatic):

   ```
   POST /payments/paystack/webhook
   → Updates transaction status in database
   ```

4. **Check status** (optional):

   ```bash
   GET /payments/PS_123/status

   Response: {
     "reference": "PS_123",
     "status": "success",
     "amount": 5000,
     "paid_at": "2025-12-06T10:30:00.000Z"
   }
   ```

---

## 🧪 Testing

### Test Google Sign-In

1. Open browser: `http://localhost:3000/auth/google`
2. Complete Google authentication
3. Check response with user information

### Test Paystack Payment

```bash
# Initialize payment
curl -X POST http://localhost:3000/payments/paystack/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "email": "test@example.com"}'

# Check status
curl http://localhost:3000/payments/PS_1234567890_ABC123/status
```

### Test with Postman

Import the following endpoints into Postman:

- GET `http://localhost:3000/auth/google?json=true`
- POST `http://localhost:3000/payments/paystack/initiate`
- GET `http://localhost:3000/payments/{reference}/status`

---

## 📁 Project Structure

```
google-signin-paystack-payment/
├── src/
│   ├── config/
│   │   ├── index.ts          # Environment configuration
│   │   └── database.ts       # MongoDB connection
│   ├── models/
│   │   ├── User.ts           # User schema
│   │   └── Transaction.ts    # Transaction schema
│   ├── services/
│   │   ├── googleAuth.service.ts   # Google OAuth logic
│   │   └── paystack.service.ts     # Paystack API integration
│   ├── routes/
│   │   ├── auth.routes.ts    # Authentication endpoints
│   │   └── payment.routes.ts # Payment endpoints
│   ├── middleware/
│   │   └── errorHandler.ts   # Error handling middleware
│   └── index.ts              # Application entry point
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Google OAuth 2.0
- **Payment**: Paystack API
- **HTTP Client**: Axios

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**: Ensure MongoDB is running:

```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

### Google OAuth Error

```
Error: redirect_uri_mismatch
```

**Solution**: Ensure redirect URI in Google Console matches exactly:

```
http://localhost:3000/auth/google/callback
```

### Paystack Initialization Failed

```
Error: Invalid key
```

**Solution**:

- Use test secret key for development: `sk_test_...`
- Verify key is correctly set in `.env` file
- Check for extra spaces or quotes

---

## 📝 Environment Variables Reference

| Variable                  | Required | Description                | Example                                      |
| ------------------------- | -------- | -------------------------- | -------------------------------------------- |
| `PORT`                    | No       | Server port                | `3000`                                       |
| `NODE_ENV`                | No       | Environment                | `development`                                |
| `MONGODB_URI`             | Yes      | MongoDB connection string  | `mongodb://localhost:27017/db`               |
| `GOOGLE_CLIENT_ID`        | Yes      | Google OAuth client ID     | `123456.apps.googleusercontent.com`          |
| `GOOGLE_CLIENT_SECRET`    | Yes      | Google OAuth client secret | `GOCSPX-...`                                 |
| `GOOGLE_REDIRECT_URI`     | Yes      | OAuth callback URL         | `http://localhost:3000/auth/google/callback` |
| `PAYSTACK_SECRET_KEY`     | Yes      | Paystack secret key        | `sk_test_...`                                |
| `PAYSTACK_WEBHOOK_SECRET` | No       | Paystack webhook secret    | `whsec_...`                                  |
| `APP_BASE_URL`            | No       | Application base URL       | `http://localhost:3000`                      |

---

## 🚀 Deployment

### Deploying to Production

1. **Set up MongoDB** (MongoDB Atlas recommended)
2. **Configure environment variables** on your hosting platform
3. **Update OAuth redirect URIs** in Google Console
4. **Set up Paystack webhook** with your production URL
5. **Enable HTTPS** for all endpoints
6. **Build and deploy**:

```bash
npm run build
npm start
```

### Recommended Hosting Platforms

- **Render**: Easy Node.js deployment
- **Railway**: Simple deployment with database
- **Heroku**: Popular platform as a service
- **DigitalOcean App Platform**: Scalable deployment

---

## 📄 License

MIT

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Paystack API Documentation](https://paystack.com/docs/api/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
