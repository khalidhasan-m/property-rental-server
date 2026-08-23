# Nestora Property Rental Server

This repository contains the backend API for Nestora, a property rental and booking platform. It is a **CommonJS JavaScript Node.js application** built with Express. The API uses the native MongoDB driver, validates requests with Zod, authenticates users with JWTs stored in HTTP-only cookies, and integrates with Stripe, Google token verification, and imgbb.

## Technology stack

| Technology | Version or configuration | Actual use |
|---|---:|---|
| Node.js | 20 or newer recommended | Server runtime |
| Express | `5.2.1` | HTTP server and REST API routing |
| CommonJS | — | Backend module system using `require` and `module.exports` |
| MongoDB Node.js Driver | `7.5.0` | Direct database access through `MongoClient` and collection APIs |
| MongoDB Atlas | External service | Cloud database hosting |
| Zod | `4.4.3` | Environment, body, query-string, and route-parameter validation |
| bcryptjs | `3.0.3` | Password hashing with 12 salt rounds and password comparison |
| jsonwebtoken | `9.0.3` | JWT signing and verification |
| cookie-parser | `1.4.7` | Reading the `accessToken` cookie |
| cors | `2.8.6` | Credential-enabled cross-origin API access |
| dotenv | `17.4.2` | Loading `.env` configuration |
| Axios | `1.19.0` | Server-side requests to the imgbb upload API |
| Stripe Node.js SDK | `22.5.0` | PaymentIntent creation and retrieval |
| Google Auth Library | `11.0.2` | Google ID-token verification |
| Node.js built-in test runner | `node:test` | API and security regression tests |
| Vercel | `api/index.js` and `vercel.json` | Serverless deployment entrypoint and route rewrite |

The server does not use Mongoose, Prisma, Firebase, Supabase, Passport, Multer, GraphQL, Socket.IO, or a separate ORM.

## Architecture

```text
src/
├── config/        Environment parsing and MongoDB connection management
├── controllers/   Authentication, property, booking, engagement, admin, and upload handlers
├── middlewares/   Authentication, role authorization, validation, and error handling
├── models/        Helper for native MongoDB collection handles
├── routes/        Express route definitions
├── services/      Property queries, analytics, Stripe, Google, and imgbb integrations
└── validations/   Zod schemas for request bodies, query strings, and parameters
api/
└── index.js       Vercel function entrypoint that exports the Express app
test/
└── app.test.js    Node.js HTTP-level API and security tests
```

The database currently uses the following MongoDB collections: `users`, `properties`, `bookings`, `favorites`, `reviews`, and `transactions`. On connection, the application creates indexes for unique user emails, owner/property lookups, property filters, tenant and owner booking lists, unique tenant-property favourites, review listings, and one transaction per booking.

## API behavior

The API base path is `/api/v1`. The root endpoint returns a server-running message, while `/api/v1/health` returns a JSON health response with status and timestamp.

### Authentication routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create a tenant or owner account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email and password |
| `POST` | `/api/v1/auth/social-login` | Public | Verify a Google ID token and sign in as a tenant |
| `POST` | `/api/v1/auth/logout` | Public | Clear the authentication cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Return the current user |
| `PATCH` | `/api/v1/auth/profile` | Authenticated | Update name, phone, or photo URL |

### Property routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/properties/featured` | Public | Return the first six approved properties |
| `GET` | `/api/v1/properties` | Public | Filter, sort, and paginate approved properties |
| `GET` | `/api/v1/properties/mine` | Owner | List the current owner's properties |
| `GET` | `/api/v1/properties/mine/:id` | Owner | Retrieve one property belonging to the owner |
| `POST` | `/api/v1/properties` | Owner | Create a pending property listing |
| `GET` | `/api/v1/properties/:id` | Authenticated | Retrieve an approved property and its owner/review summary |
| `PATCH` | `/api/v1/properties/:id` | Owner or admin | Update a property; owner edits return it to pending status |
| `DELETE` | `/api/v1/properties/:id` | Owner or admin | Delete a property and its favourites |
| `GET` | `/api/v1/properties/admin/all` | Admin | List properties for moderation |
| `PATCH` | `/api/v1/properties/admin/:id/moderate` | Admin | Approve or reject a property with optional feedback |

Property queries support `page`, `limit`, `search`, `location`, `propertyType`, `minPrice`, `maxPrice`, and `sort`. Search input is escaped before it is used in MongoDB regular expressions.

### Booking and payment routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Tenant | Create a booking request for an approved property |
| `GET` | `/api/v1/bookings/mine` | Tenant | List the current tenant's bookings |
| `GET` | `/api/v1/bookings/owner` | Owner | List booking requests for the current owner's properties |
| `PATCH` | `/api/v1/bookings/:id/decision` | Owner | Approve or reject a booking request |
| `POST` | `/api/v1/bookings/payment-intent` | Tenant | Create a Stripe PaymentIntent for an unpaid booking |
| `POST` | `/api/v1/bookings/confirm-payment` | Tenant | Retrieve and verify a successful Stripe PaymentIntent |
| `GET` | `/api/v1/bookings/admin/all` | Admin | List all bookings with tenant, owner, and property data |

The server creates Stripe PaymentIntents in USD, converts the rental amount to cents, enables automatic payment methods, stores the booking ID and property title in metadata, and records a successful payment in the `transactions` collection. The current implementation has no Stripe webhook endpoint; confirmation is performed by the authenticated client flow followed by server-side PaymentIntent retrieval.

### Favourites and review routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/reviews/featured` | Public | Return up to four recent reviews for approved properties |
| `GET` | `/api/v1/favorites` | Tenant | List saved properties |
| `POST` | `/api/v1/favorites` | Tenant | Save an approved property |
| `DELETE` | `/api/v1/favorites/:id` | Tenant | Remove a saved property |
| `POST` | `/api/v1/reviews` | Tenant | Create or update a review after a paid booking |
| `GET` | `/api/v1/reviews/:id` | Public | List reviews for a property |

### Administrative and upload routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | Admin | Paginated user list with optional search |
| `PATCH` | `/api/v1/admin/users/:id/role` | Admin | Change a user's role; an admin cannot change their own role |
| `GET` | `/api/v1/admin/transactions` | Admin | Paginated successful transaction ledger |
| `GET` | `/api/v1/admin/owner/analytics` | Owner | Return property count, approved paid-booking count, total earnings, and twelve monthly earnings values |
| `POST` | `/api/v1/uploads/images` | Owner | Upload one to eight base64 images to imgbb |

## Authentication and security

The server signs a JWT containing the user ID and stores it in an `accessToken` cookie. The cookie is `httpOnly`, has a root path, uses `sameSite: lax` in development and `sameSite: none` in production, and becomes secure in production or when `COOKIE_SECURE=true`. Every protected request verifies the token and reloads the user from MongoDB.

Express is configured with credential-enabled CORS using the comma-separated `CLIENT_URL` allowlist. State-changing requests with an untrusted `Origin` are rejected. The app disables `x-powered-by` and adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a strict referrer policy. JSON request bodies are limited to `10mb` because image uploads are submitted as base64 data.

The application uses a centralized error handler. Duplicate MongoDB key errors return HTTP `409`, validation failures return HTTP `400` with issue paths, and production responses hide unexpected server-error details.

## Environment variables

Create the server environment file from the template:

```bash
cp .env.example .env
```

| Variable | Required status | Description |
|---|---|---|
| `NODE_ENV` | Optional | `development`, `test`, or `production`; defaults to `development`. |
| `PORT` | Optional | HTTP port; defaults to `5000`. |
| `MONGODB_URI` | Required | MongoDB connection string. |
| `MONGODB_DB` | Optional | Database name; defaults to `property_rental`. |
| `JWT_SECRET` | Required | At least 24 characters; used to sign authentication JWTs. |
| `JWT_EXPIRES_IN` | Optional | JWT lifetime; defaults to `7d`. |
| `CLIENT_URL` | Optional | One or more valid frontend origins separated by commas; defaults to `http://localhost:3000`. |
| `STRIPE_SECRET_KEY` | Required for payments | Stripe server secret key. |
| `IMGBB_API_KEY` | Required for uploads; required in production | imgbb API key. |
| `GOOGLE_CLIENT_ID` | Required for Google sign-in | Google OAuth web client ID used to verify ID tokens. |
| `COOKIE_SECURE` | Optional | String value `true` or `false`; defaults to `false`. |

Never commit real MongoDB credentials, JWT secrets, Stripe secret keys, Google credentials, or the imgbb API key.

## Local development

Install Node.js 20 or newer and pnpm. Configure a reachable MongoDB database before starting the server.

```bash
git clone https://github.com/khalidhasan-m/property-rental-server.git
cd property-rental-server
cp .env.example .env
# Edit .env and set MONGODB_URI and JWT_SECRET at minimum.
pnpm install
pnpm dev
```

The development command uses Node's built-in watch mode. The API will be available at `http://localhost:5000` unless `PORT` is changed.

Useful commands:

| Command | Description |
|---|---|
| `pnpm dev` | Start the server with `node --watch`. |
| `pnpm start` | Start the server normally. |
| `pnpm test` | Run the Node.js regression tests with test environment variables. |

## Testing

`test/app.test.js` starts the Express app on a temporary local HTTP port and currently verifies the health response, security headers, removal of `x-powered-by`, JSON 404 handling, rejection of an untrusted state-changing origin, and the authentication requirement on the property-detail endpoint.

The test command supplies a local MongoDB URI and test JWT secret through the script itself. Full database-backed feature testing still requires a running MongoDB instance and configured third-party credentials for the relevant integrations.

## Initial admin setup

Registration accepts only `tenant` and `owner` roles. To create the first administrator, register an account and change that user's `role` field to `admin` in MongoDB. Administrators can then change other users' roles through the admin API.

## Deployment on Vercel

The repository includes `api/index.js`, which exports the Express app, and `vercel.json`, which rewrites incoming requests to that serverless function. Deploy the repository as a Node.js project and configure the server environment variables in Vercel.

For a cross-origin deployed client, set `CLIENT_URL` to the exact frontend origin, set `COOKIE_SECURE=true`, use HTTPS for both applications, and provide the production Stripe, Google, and imgbb values as server-only variables. Set the frontend's `NEXT_PUBLIC_API_URL` to the deployed API URL ending in `/api/v1`.

## Related repository

The companion frontend is maintained at [khalidhasan-m/property-rental-client](https://github.com/khalidhasan-m/property-rental-client).

## License

No license file is currently included in this repository.
