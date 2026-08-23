# Nestora — Property Rental & Booking Platform API

Nestora Server is the **CommonJS JavaScript** Express API for the Assignment 10 property-rental platform. It provides secure JWT cookie authentication, role-based access control, property management, bookings, Stripe payments, reviews, favourites, owner earnings analytics, administrator operations, Google social-login verification, and imgbb image uploads.

## Project Details

The API is designed around an Express architecture with separate routes, controllers, services, models, validations, and middleware. It uses the **native MongoDB driver** with MongoDB Atlas, Zod for request validation, and JWT stored in an HTTP-only cookie. The API is ready for Vercel serverless deployment through `api/index.js` and `vercel.json`.

```text
src/
├── config/        Environment parsing and MongoDB connection
├── controllers/   Request handlers for each application domain
├── middlewares/   JWT authentication, roles, validation, and error handling
├── models/        Native MongoDB collection access
├── routes/        Express API routes
├── services/      Stripe, imgbb, Google, analytics, and property logic
└── validations/   Zod request schemas
```

## Main Features

| Area | Included functionality |
| --- | --- |
| Authentication | Register, login, logout, profile updates, JWT HTTP-only cookie session, role protection, and verified Google ID-token login. |
| Properties | Owner create, edit, delete, and retrieve listings; public approved listings with filters, sorting, and pagination; admin moderation. |
| Booking and payments | Tenant booking requests, Stripe PaymentIntents, server-side payment verification, transactions, and owner approve/reject actions. |
| Engagement | Tenant favourites, completed-booking ratings, and property reviews. |
| Dashboards | Owner summary metrics and twelve-month earnings data; admin users, properties, bookings, and transactions. |
| Media uploads | Owner-only multiple image upload endpoint using imgbb. |

## Run Locally

### Prerequisites

Install Node.js 20 or newer, pnpm, and create a free MongoDB Atlas database. Stripe, imgbb, and Google credentials are only required when testing their related features.

```bash
git clone https://github.com/khalidhasan-m/property-rental-server.git
cd property-rental-server
cp .env.example .env
pnpm install
pnpm dev
```

The API starts at `http://localhost:5000`. Check the server with:

```bash
curl http://localhost:5000/api/v1/health
```

## Environment Variables

Create `.env` from `.env.example` and provide the following values.

| Variable | Description |
| --- | --- |
| `PORT` | Local server port; defaults to `5000`. |
| `MONGODB_URI` | MongoDB Atlas connection string. |
| `MONGODB_DB` | Database name, for example `property_rental`. |
| `JWT_SECRET` | Long random secret for signing JWT cookies. |
| `JWT_EXPIRES_IN` | JWT lifetime, for example `7d`. |
| `CLIENT_URL` | Allowed client origin, for example `http://localhost:3000`. |
| `STRIPE_SECRET_KEY` | Stripe secret test or live key. |
| `IMGBB_API_KEY` | imgbb API key for property image uploads. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID for token verification. |
| `COOKIE_SECURE` | Use `false` locally and `true` in production. |

## Available Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Starts the CommonJS server in watch mode. |
| `pnpm start` | Starts the server normally. |
| `pnpm test` | Runs Node.js tests when present. |

## Initial Admin Account

Register an account normally from the client application, then manually update that user document in MongoDB from `role: "tenant"` to `role: "admin"`. This is the required initial admin setup process for the assignment.

## Deployment

Deploy this repository to Vercel as a Node.js project. The included `api/index.js` file exposes the Express app as a serverless function. Add the environment variables in Vercel, set `COOKIE_SECURE=true`, and change `CLIENT_URL` to the deployed frontend address. Then place the deployed API URL in the client’s `NEXT_PUBLIC_API_URL` variable.
