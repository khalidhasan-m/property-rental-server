# Nestora Property Rental — Server

Nestora is a property rental and booking marketplace. Tenants can discover approved properties, save favourites, submit booking requests, pay reservation fees through Stripe, and write reviews after a paid booking. Owners can create and manage listings, respond to booking requests, and view earnings. Administrators can manage users, moderate properties, monitor bookings, and inspect transactions.

This repository contains the **Express backend API**. The frontend is maintained separately in [`property-rental-client`](https://github.com/khalidhasan-m/property-rental-client).

## Project links

| Item | Link or value |
|---|---|
| Server repository | [`khalidhasan-m/property-rental-server`](https://github.com/khalidhasan-m/property-rental-server) |
| Client repository | [`khalidhasan-m/property-rental-client`](https://github.com/khalidhasan-m/property-rental-client) |
| Production API URL | https://property-rental-server-bice.vercel.app |
| Production health check | https://property-rental-server-bice.vercel.app/api/v1/health |
| Local API URL | `http://localhost:5050` |
| API base path | `/api/v1` |

## Technology stack

| Technology | Version or use |
|---|---|
| Node.js | 20 or newer recommended |
| npm | Package manager |
| Express | `5.2.1`, HTTP server and REST routing |
| MongoDB Node.js Driver | `7.5.0`, direct MongoDB access |
| MongoDB Atlas | Cloud database hosting option |
| Zod | Environment, body, query, and route-parameter validation |
| bcryptjs | Password hashing with 12 salt rounds |
| jsonwebtoken | JWT signing and verification |
| cookie-parser | HTTP-only authentication-cookie parsing |
| cors | Credential-enabled cross-origin API access |
| dotenv | Environment configuration |
| Stripe Node.js SDK | PaymentIntent creation and retrieval |
| Google Auth Library | Google ID-token verification |
| Axios | ImgBB upload requests |
| Node.js built-in test runner | API and security regression tests |
| Vercel | Serverless deployment through `api/index.js` and `vercel.json` |

The server uses the native MongoDB driver rather than Mongoose, Prisma, or a separate ORM. It does not use Firebase, Supabase, Passport, Multer, GraphQL, Socket.IO, or Redux.

## Architecture

```text
src/
├── config/        Environment parsing and MongoDB connection management
├── controllers/   Authentication, property, booking, engagement, admin, and upload handlers
├── middlewares/   Authentication, role authorization, validation, and error handling
├── models/        Native MongoDB collection helpers
├── routes/        Express route definitions
├── services/      Property queries, analytics, Stripe, Google, and ImgBB integrations
└── validations/   Zod request and environment schemas
api/
└── index.js       Vercel serverless-function entrypoint
test/
└── app.test.js    Node.js HTTP-level API and security tests
```

MongoDB collections are `users`, `properties`, `bookings`, `favorites`, `reviews`, and `transactions`. On connection, the application creates indexes for unique user emails, owner/property lookups, property filters, tenant and owner booking lists, unique tenant-property favourites, review listings, and one transaction per booking.

## API reference

All API routes use the `/api/v1` prefix unless otherwise noted. The root endpoint returns a server-running message, and `/api/v1/health` returns a JSON health response with status and timestamp.

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create a Tenant or Owner account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email and password |
| `POST` | `/api/v1/auth/social-login` | Public | Verify Google ID token and sign in; new social users become Tenants |
| `POST` | `/api/v1/auth/logout` | Public | Clear the authentication cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Return the current user |
| `PATCH` | `/api/v1/auth/profile` | Authenticated | Update name, phone, or photo URL |

### Properties

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/properties/featured` | Public | Return up to six approved properties |
| `GET` | `/api/v1/properties` | Public | Filter, sort, and paginate approved properties |
| `GET` | `/api/v1/properties/mine` | Owner | List the current Owner’s properties |
| `GET` | `/api/v1/properties/mine/:id` | Owner | Retrieve one property belonging to the Owner |
| `POST` | `/api/v1/properties` | Owner | Create a Pending property listing |
| `GET` | `/api/v1/properties/:id` | Authenticated | Retrieve an approved property and owner/review summary |
| `PATCH` | `/api/v1/properties/:id` | Owner or Admin | Update a property; Owner edits return to Pending review |
| `DELETE` | `/api/v1/properties/:id` | Owner or Admin | Delete a property and related favourites |
| `GET` | `/api/v1/properties/admin/all` | Admin | List properties for moderation |
| `PATCH` | `/api/v1/properties/admin/:id/moderate` | Admin | Approve or reject a property with feedback |

Property queries support `page`, `limit`, `search`, `location`, `propertyType`, `minPrice`, `maxPrice`, and `sort`. Search text is escaped before it is used in MongoDB regular expressions.

### Bookings and payments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Tenant | Create a booking request for an approved property |
| `GET` | `/api/v1/bookings/mine` | Tenant | List the current Tenant’s bookings |
| `GET` | `/api/v1/bookings/owner` | Owner | List booking requests for the Owner’s properties |
| `PATCH` | `/api/v1/bookings/:id/decision` | Owner | Approve or reject a booking request |
| `POST` | `/api/v1/bookings/payment-intent` | Tenant | Create a Stripe PaymentIntent for an unpaid booking |
| `POST` | `/api/v1/bookings/confirm-payment` | Tenant | Retrieve and confirm a successful PaymentIntent |
| `GET` | `/api/v1/bookings/admin/all` | Admin | List all bookings with tenant, owner, and property data |

The current payment flow creates a PaymentIntent in USD, converts the rental amount to cents, enables automatic payment methods, stores booking metadata, and records a successful transaction after client confirmation and server-side PaymentIntent retrieval. There is currently no Stripe webhook endpoint; add one if webhook-based production reconciliation is required.

### Favourites and reviews

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/reviews/featured` | Public | Return up to four recent reviews for approved properties |
| `GET` | `/api/v1/owners/trusted` | Public | Return up to four trusted owners for the homepage |
| `GET` | `/api/v1/favorites` | Tenant | List saved properties |
| `POST` | `/api/v1/favorites` | Tenant | Save an approved property |
| `DELETE` | `/api/v1/favorites/:id` | Tenant | Remove a saved property |
| `POST` | `/api/v1/reviews` | Tenant | Create or update a review after a paid booking |
| `GET` | `/api/v1/reviews/:id` | Public | List reviews for a property |

### Administration and uploads

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | Admin | Paginated user list with optional search |
| `PATCH` | `/api/v1/admin/users/:id/role` | Admin | Change a user role; an Admin cannot change their own role |
| `GET` | `/api/v1/admin/transactions` | Admin | Paginated successful transaction ledger |
| `GET` | `/api/v1/admin/owner/analytics` | Owner | Return owner totals and twelve monthly earnings values |
| `POST` | `/api/v1/uploads/images` | Owner | Upload one to eight base64 images to ImgBB |

## Roles and security

The supported roles are `tenant`, `owner`, and `admin`. Every protected request verifies the JWT in the HTTP-only `accessToken` cookie and reloads the user from MongoDB. Role middleware enforces access to Tenant, Owner, and Admin endpoints.

The server uses credential-enabled CORS with the comma-separated `CLIENT_URL` allowlist. State-changing requests with an untrusted `Origin` are rejected. Express disables `x-powered-by` and sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a strict referrer policy. Production error responses hide unexpected server details. JSON request bodies are limited to `50mb` to support heavy owner image uploads using base64 data.

Never commit MongoDB credentials, JWT secrets, Stripe secret keys, Google credentials, or the ImgBB API key. The `.env` file is excluded from Git.

## Environment variables

Create the local environment file from the safe template:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development`, `test`, or `production`; defaults to `development`. |
| `PORT` | No | HTTP port; defaults to `5050`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `MONGODB_DB` | No | Database name; defaults to `property_rental`. |
| `JWT_SECRET` | Yes | At least 24 characters; signs authentication JWTs. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `7d`. |
| `CLIENT_URL` | Recommended | Exact frontend origin, or comma-separated allowed origins. |
| `STRIPE_SECRET_KEY` | For payments | Server-only Stripe secret key. |
| `IMGBB_API_KEY` | For uploads; required in production | Server-only ImgBB API key. |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Google OAuth web client ID. |
| `COOKIE_SECURE` | No | `true` or `false`; use `true` with HTTPS. |

## Local development

Use Node.js 20 or newer and npm:

```bash
node --version
npm --version
git clone https://github.com/khalidhasan-m/property-rental-server.git
cd property-rental-server
npm install
cp .env.example .env
```

Edit `.env` and set at least `MONGODB_URI` and `JWT_SECRET`. Set Stripe, Google, and ImgBB variables when testing those integrations. Start the development server:

```bash
npm run dev
```

The API is available at [http://localhost:5050](http://localhost:5050), with the health endpoint at [http://localhost:5050/api/v1/health](http://localhost:5050/api/v1/health).

| Command | Purpose |
|---|---|
| `npm run dev` | Start the server with Node’s watch mode. |
| `npm run start` | Start the server normally. |
| `npm test` | Run the Node.js regression tests. |

## Testing

Run the automated tests with:

```bash
npm test
```

The current regression suite checks the health response, security headers, removal of `x-powered-by`, JSON 404 handling, rejection of an untrusted state-changing origin, and authentication protection on the property-detail endpoint. Full database-backed testing requires a reachable MongoDB instance. Google, Stripe, and ImgBB integration tests also require their respective configured credentials.

For final acceptance, test all three roles against their allowed and denied endpoints; property creation and moderation; rejection feedback; public filtering/sorting/pagination; favourites; reviews; booking status transitions; Stripe success/failure/cancellation; transaction creation; owner analytics; cross-user isolation; and production CORS, route, and cookie behavior.

## Initial administrator setup

Registration accepts only `tenant` and `owner` roles. To create the first administrator, register an account and change that user’s `role` field to `admin` directly in MongoDB using a secure administrative connection. After that, Administrators can change other user roles through the admin API. Never expose the administrator password in source control or the public README.

## Deployment on Vercel

The repository includes `api/index.js`, which exports the Express app, and `vercel.json`, which rewrites incoming requests to that serverless function. Deploy the repository as a Node.js project and configure the environment variables in the Vercel project.

For a cross-origin production client, set `CLIENT_URL` to the exact frontend origin, set `COOKIE_SECURE=true`, use HTTPS for both applications, and configure production Stripe, Google, and ImgBB values as server-only variables. Set the client’s `NEXT_PUBLIC_API_URL` to the deployed API URL ending in `/api/v1`. After deployment, add the real production API and health URLs to the **Project links** table above.

## Repository structure and license

The project uses CommonJS JavaScript and keeps backend business logic in `src`. Dependency installation is managed by npm with `package.json` and `package-lock.json`. No license file is currently included.
