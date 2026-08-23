# Nestora — Property Rental & Booking Platform (Server)

**Nestora Server** is the CommonJS Node.js and Express API for the property rental marketplace. It uses the native MongoDB driver, Zod validation, secure JWT HTTP-only cookies, Stripe payment verification, imgbb multi-upload, and role-based access control.

## Live URL

Add the Vercel API deployment URL after deployment: `https://property-rental-server.vercel.app/api/v1`

## Architecture

```text
src/
  config/       Environment parsing and MongoDB connection
  controllers/  Authentication, properties, bookings, admin, uploads, engagement
  middlewares/  JWT cookie auth, roles, Zod validation, errors
  models/       Native MongoDB collection access layer
  routes/       Express route modules
  services/     Stripe, imgbb, Google token, analytics, property aggregation
  validations/  Zod request schemas
api/index.js    Vercel serverless Express entry point
```

## Key Features

| Domain | Included capabilities |
| --- | --- |
| Security | Validated environment configuration, Zod request validation, bcrypt hashing, JWT in HTTP-only cookies, credentials-enabled CORS, role middleware, and verified Google ID-token social login. |
| Properties | Owner create, update, delete, private listing retrieval, admin moderation feedback, public approved listing filters, featured listings, sort, and pagination. |
| Booking & payments | Tenant booking creation, Stripe PaymentIntent creation, server-side Stripe payment verification, transaction persistence, and owner approve/reject workflow. |
| Engagement | Tenant favorites, verified-booking reviews and ratings, and enriched review responses. |
| Dashboards | Owner earnings analytics for the last 12 months; admin users, properties, bookings, and paginated transactions. |
| Uploads | Owner-only multiple base64 image upload endpoint using imgbb. |

## Local Setup

1. Copy `.env.example` to `.env` and provide all required credentials.
2. Install dependencies with `pnpm install`.
3. Start the server with `pnpm dev`.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The API runs at `http://localhost:5000`, with its health endpoint at `GET /api/v1/health`.

## Environment Variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string. |
| `MONGODB_DB` | Database name, e.g. `property_rental`. |
| `JWT_SECRET` | Long random secret used to sign access cookies. |
| `JWT_EXPIRES_IN` | Cookie-session JWT lifetime, e.g. `7d`. |
| `CLIENT_URL` | Comma-separated allowed client origins; normally the Vercel client URL. |
| `STRIPE_SECRET_KEY` | Stripe secret key for PaymentIntent creation and verification. |
| `IMGBB_API_KEY` | imgbb upload API key. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID used to verify ID tokens. |
| `COOKIE_SECURE` | Set to `true` in production. |

## Deployment

Deploy the repository to Vercel as a Node.js project. The included `api/index.js` exports the Express application and `vercel.json` rewrites requests to it. Add every environment value in the Vercel project settings. In production, use the client URL as `CLIENT_URL`, set `COOKIE_SECURE=true`, and ensure client and server are both deployed over HTTPS.

## Initial Admin

Register a standard account using the client, then change that user’s MongoDB document manually from `role: "tenant"` to `role: "admin"` before using administrative endpoints. This follows the assignment’s required admin bootstrap process.
