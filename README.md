# Almaari

Almaari is a full-stack e-commerce platform built with Next.js 16 (App Router with SSR Server Components & SEO metadata), PostgreSQL, Prisma, NextAuth v5, and a background FastAPI + Celery Job Scheduler. It supports customer shopping flows, cart and checkout, payment methods, order history, password reset, notifications, and an admin dashboard for product and order management.

## Features

- Public product browsing with search, sorting, pagination, and category filtering
- SEO-optimized Server Components (SSR) with dynamic page metadata
- Variant-based products with color, size, and stock tracking
- Persistent cart with quantity updates, item removal, and cart count badge
- Checkout with saved addresses, credit/debit card payment via Stripe Elements, or Cash on Delivery (COD)
- Order history and order detail pages for customers with automated retry payment support
- Saved customer payment methods and shipping addresses
- Admin product listing, creation, editing, preview, bulk upload, and soft delete
- Admin order management with status updates and stock restoration on cancellation
- FastAPI + Celery + Redis background job scheduler for async email dispatch and bulk processing
- Email-based forgot-password and reset-password flow
- Google OAuth and credentials-based authentication with fixed remember-me expiry

## Tech Stack

- **Frontend / Framework**: Next.js 16 (App Router, SSR Server Components), React 19, TypeScript 5
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Authentication**: NextAuth v5, Google OAuth, Credentials with custom session proxy
- **Background Jobs**: FastAPI, Celery, Redis (Python)
- **Styling**: Tailwind CSS v4, Lucide React
- **Payments**: Stripe (Stripe Elements & Webhooks)
- **State Management & Validation**: Zustand, Zod
- **Media Storage**: Cloudinary
- **Logging & Utilities**: Pino, Nodemailer, bcryptjs

## Project Structure

- `app/` - App Router SSR pages, layouts, and Next.js API routes
- `components/` - Shared UI, client components, layout, and admin interfaces
- `controllers/` - Thin HTTP controllers for API routes
- `services/` - Business logic and Prisma database operations
- `job-schedular/` - FastAPI + Celery + Redis background job scheduler service
- `hooks/` - Client hooks and contexts
- `lib/` - Shared helpers, constants, validation schemas, Stripe/Cloudinary integrations, and logging
- `prisma/` - Database schema and migrations
- `public/` - Static assets
- `store/` - Zustand client stores
- `types/` - Shared TypeScript types
- `tests/` - Jest test suites for API controllers, services, and components

## Environment Variables

Create a `.env.local` or `.env` file in the project root with the following values:

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

# Cloudinary Setup for Image Uploads
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# App Environment (set to "dev" to enable artificial loading delays)
NEXT_PUBLIC_APP_ENV="dev"

# Stripe Setup
STRIPE_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# FastAPI Job Scheduler Service
JOB_SCHEDULER_URL="Scheduler server url"
```

### Variable Notes

- `DATABASE_URL` is required by Prisma and must point to your PostgreSQL database.
- `AUTH_SECRET` is used for signing authentication JWT tokens.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for Google OAuth sign-in.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are used for password reset and notification emails.
- `APP_URL` defines the base URL (e.g. `http://localhost:3000`) for password reset links and payment return URLs.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` power product image uploads and image optimization.
- `NEXT_PUBLIC_APP_ENV` controls artificial loading delays for UX testing: set to `"dev"` to enable delays or `"production"` to run without delays.
- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are retrieved from the Stripe Dashboard.
- `STRIPE_WEBHOOK_SECRET` is obtained after configuring a webhook endpoint pointing to `/api/stripe/webhook` in the Stripe Dashboard.
- `JOB_SCHEDULER_URL` points to the FastAPI job scheduler background service (e.g. `http://localhost:8000` or an ngrok tunnel).

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

Copy `.env.example` to `.env` and fill in your PostgreSQL, Google OAuth, Stripe, Cloudinary, and SMTP credentials.

### 3. Apply Prisma migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5. Start the FastAPI Job Scheduler (Optional for Background Tasks)

Navigate to `job-schedular` and run:

```bash
cd job-schedular
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Available Scripts

- `npm run dev` - Start the Next.js development server
- `npm run build` - Build the production application bundle
- `npm run start` - Start the Next.js production server
- `npm run lint` - Run ESLint code quality checks
- `npm test` - Run Jest test suites for API services, controllers, and components

## Main Architecture & Flows

- **SSR & SEO Pages**: Route files in `app/**/page.tsx` are SSR Server Components exporting `Metadata` / `generateMetadata` for SEO, rendering client-side UI components (`*-client.tsx`).
- **Product Browsing**: Home and products pages fetch product data through `/api/products`.
- **Cart & Checkout**: Cart operations go through `/api/cart`; checkout supports saved addresses (`/api/addresses`) and saved payment methods (`/api/stripe/payment-methods`).
- **Order Processing**: Orders are created via `/api/orders`; status changes and inventory restorations are managed by `/api/admin/orders/[id]`.
- **Authentication & Sessions**: Handled by NextAuth v5 (`/api/auth/[...nextauth]`) with session handling proxied via `proxy.ts` to enforce fixed cookie ex-piries based on remember-me state.
- **Background Jobs**: FastAPI service in `job-schedular/` processes email queues and bulk product uploads asynchronously via Celery and Redis.

## Deployment

This project can be deployed on Vercel or any platform that supports Next.js 16 and PostgreSQL. Make sure your production environment includes all environment variables listed above.
