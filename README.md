# Almaari

Almaari is a full-stack e-commerce platform built with Next.js 16, PostgreSQL, Prisma, and NextAuth v5. It supports customer shopping flows, cart and checkout, order history, password reset, notifications, and an admin dashboard for product and order management.

## Features

- Public product browsing with search, sorting, pagination, and category filtering
- Variant-based products with color, size, and stock tracking
- Persistent cart with quantity updates, item removal, and cart count badge
- Checkout with saved addresses or new address creation
- Order history and order detail pages for customers
- Admin product listing, creation, editing, preview, and soft delete
- Admin order management with status updates and stock restoration on cancellation
- Notification system with broadcast and user-specific notifications
- Email-based forgot-password and reset-password flow
- Google OAuth and credentials-based authentication with fixed remember-me expiry

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- PostgreSQL
- Prisma ORM
- NextAuth v5
- Tailwind CSS v4
- Zod
- Zustand
- Lucide React
- Nodemailer
- bcryptjs
- Pino

## Project Structure

- `app/` - App Router pages, layouts, and API routes
- `components/` - Shared UI, layout, and admin components
- `controllers/` - Thin HTTP controllers for API routes
- `services/` - Business logic and Prisma operations
- `hooks/` - Client hooks and contexts
- `lib/` - Shared helpers, constants, validation schemas, and logging
- `prisma/` - Database schema and migrations
- `public/` - Static assets and uploaded product images
- `store/` - Zustand stores
- `types/` - Shared TypeScript types
- `scripts/` - Utility scripts such as PR body generation

## Environment Variables

Create a `.env.local` file in the project root with the following values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cart_attack"
AUTH_SECRET="<your-auth-secret-here>"

# Nodemailer Setup for Forgot Password flow
SMTP_HOST="your-host"
SMTP_PORT= # SMTP PORT
SMTP_USER="email@example.com"
SMTP_PASS="16 digit Google App Password"
RESET_TOKEN_EXP="Reset Password link expiry time in milliseconds"
APP_URL="reset password redirect url for emails"

# Sign in with Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cloudinary image uploads
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# App Environment (set to "dev" to enable artificial loading delays)
NEXT_PUBLIC_APP_ENV="dev"
```

### Variable Notes

- `DATABASE_URL` is required by Prisma and must point to your PostgreSQL database.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for Google sign-in.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are used for password reset emails.
- `APP_URL` is used to build password-reset links. If omitted, the app falls back to `http://localhost:3000`.
- `NODE_ENV` is set automatically by your runtime and is used internally for development vs production behavior.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` power admin product image uploads and remote image delivery.
- `NEXT_PUBLIC_APP_ENV` controls artificial loading delays for UX testing: set it to "dev" to enable delays (1–2 seconds on some flows), or "production" to run without delays.
- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are retrieved from the Stripe Dashboard.
- `STRIPE_WEBHOOK_SECRET` is obtained after configuring a webhook endpoint pointing to `/api/stripe/webhook` in the Stripe Dashboard.
- `NEXT_PUBLIC_APP_URL` defines the base URL (e.g. `http://localhost:3000`) for payment redirect return URLs.

## Stripe Configuration

To set up Stripe Payments:

1. Enable **Smart Retries** in Stripe Dashboard Settings (Max attempts: 3, Retry window: 3 days).
2. Add a Webhook endpoint pointing to `https://your-domain.com/api/stripe/webhook` and subscribe to `payment_intent.succeeded` and `payment_intent.payment_failed` events.
3. Add the API keys and webhook signing secret to your environment variables.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create `.env.local` using the template above and make sure PostgreSQL, Google OAuth, and SMTP credentials are configured.

### 3. Apply Prisma migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production bundle
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## Main Flows

- Home and products pages fetch product data through `/api/products`
- Cart operations go through `/api/cart`
- Orders are created through `/api/orders`
- Customer addresses are handled by `/api/addresses`
- Authentication is handled by `/api/auth/[...nextauth]` for sign-in, sign-out, and callbacks, while `proxy.ts` owns session reads and cookie expiry
- Admin product and order management lives under `/api/admin/*`
- Notifications are loaded from `/api/notifications`

## Database Overview

The Prisma schema includes:

- Users with roles and password reset tokens
- Products with categories, variants, and images
- Colors and sizes for variant selection
- Cart items with quantity and reserved stock
- Orders and order items
- Saved addresses
- Notifications and notification read tracking

## Notes

- Product images uploaded by admins are stored in Cloudinary and served from Cloudinary URLs.
- Product deletions are soft deletes so order history can still reference past purchases.
- Cart items expire after a fixed duration and are purged automatically when the cart is fetched.
- Notification read state is tracked differently for broadcast and user-specific notifications.
- Remember me is fixed at login time: unchecked sessions expire 24 hours after login, checked sessions expire 7 days after login, and refreshes do not slide the expiry window forward.

## Authentication And Sessions

NextAuth still handles the provider flows, but session handling is custom.

1. Login creates a JWT with a fixed `exp` based on the remember-me checkbox.
2. The JWT stores the identity data the app needs, including `id`, `role`, `provider`, and `rememberMe`.
3. `proxy.ts` intercepts `/api/auth/session` and returns a custom session payload directly from the decoded JWT.
4. The proxy rewrites `Set-Cookie` so the browser cookie expiry matches the JWT expiry exactly.
5. Because the session route never reaches NextAuth, the token is not re-signed on refresh.

That means:

- Remember me unchecked: login time + 24 hours
- Remember me checked: login time + 7 days
- Page refresh: no sliding expiry
- Cookie value: stays stable unless the user signs in again

## Deployment

This project can be deployed on Vercel or any platform that supports Next.js and PostgreSQL. Make sure your production environment includes the same variables listed above, plus any platform-specific database and SMTP settings.
