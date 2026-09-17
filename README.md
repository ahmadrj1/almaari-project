# Almaari (Cart-Attack)

Full-stack e-commerce application built with Next.js 16, React 19, TypeScript, PostgreSQL, Prisma, NextAuth v5, Stripe, and a Python background microservice (FastAPI + Celery + Redis).

> [!IMPORTANT]
> **Admin Dashboard Responsiveness**: All admin pages (`/admin/*`) are intentionally designed for desktop screens only (minimum width 1024px). Admin pages are **not responsive** and must remain this way.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router, Server Components SSR), React 19, TypeScript 5, Tailwind CSS v4, Lucide React, Zustand |
| **Backend (Main)** | Next.js API Route Handlers, Node.js Custom HTTP + Socket.IO Server (`server.ts`), Prisma ORM 5 |
| **Database** | PostgreSQL |
| **Job Scheduler** | Python 3.9+, FastAPI, Celery, Redis, SQLAlchemy, Pydantic |
| **Authentication** | NextAuth v5 (Beta 32), Google OAuth, Credentials (bcryptjs), Custom session proxy |
| **Payments** | Stripe Elements, Stripe SetupIntents, Webhooks |
| **Storage & Media** | Cloudinary |
| **Logging & Utilities**| Pino, Pino-Pretty, ExcelJS, Zod |

---

## Core Features

- **Storefront & Catalog**:
  - SSR product browsing with dynamic SEO metadata and OpenGraph tags.
  - Full-text keyword search, price range filtering, category filtering, and variant filtering (color and size).
  - Dual pagination options: page-based pagination and cursor-based infinite scrolling.
  - Stock validation and out-of-stock badges per color/size combination.
- **Auto-Generated SKU System**:
  - Consistent SKU formatting: `<NAME-3>-<COLOR-3>-<SIZE>` (e.g., `TSH-BLK-M`).
  - Automated next-sequence SKU generator and collision validator.
- **Cart Management**:
  - Persistent server-synced cart for authenticated users with automatic guest cart merging on login.
  - Real-time stock validation at cart view and checkout entry.
  - Cart counter badge with optimistic updates via Zustand.
- **Checkout & Payments**:
  - Multi-step checkout: Shipping Address selection/entry -> Payment Method -> Order Review.
  - Multiple payment methods: Cash on Delivery (COD) and Credit/Debit Card via Stripe Elements.
  - Card saving via Stripe SetupIntent for 1-click future checkouts.
  - Smart retries and error handling for declined/incomplete card charges.
- **Order Lifecycle & Customer Accounts**:
  - Customer order history with live status updates (PENDING, PAID, SHIPPED, DELIVERED, CANCELLED).
  - Detailed order view with status progress bar, item breakdowns, and shipping address.
  - One-click Reorder capability (re-populates cart with available items).
  - One-click Retry Payment for failed transactions.
  - Address book management (create, update, delete, set default).
  - Saved payment cards management (delete, set default).
- **Authentication & Security**:
  - NextAuth v5 credentials-based authentication with bcrypt-hashed passwords.
  - Google OAuth single sign-on.
  - Remember-me session toggle: 30-day cookie expiry when checked, 1-day session cookie when unchecked.
  - Immediate forced logout if the authenticated user record is removed from the database.
  - Secure token-based forgot password and password reset flow handled asynchronously.
- **Real-Time Notifications**:
  - Socket.IO server integrated directly into `server.ts` with room-based user channels.
  - In-app notification dropdown with unread badge counter and mark-as-read support.
  - Fallback polling mechanism when WebSockets are disabled (`NEXT_PUBLIC_SOCKET_ENABLED="false"`).
- **Admin Management (Desktop Only)**:
  - Product catalog table with filters, search, inline stock status, and soft deletion.
  - Product creator/editor supporting multi-variant matrices (color hex codes, size tags, prices, stock quantities, and SKU generation).
  - Direct image uploads to Cloudinary with drag-and-drop preview.
  - Bulk product ingestion via Excel (.xlsx) or JSON with schema validation.
  - Order fulfillment dashboard with real-time status transitions and automatic inventory restoration upon cancellation.
- **Background Worker & Job Scheduler**:
  - Asynchronous email delivery via Celery worker (password reset emails, order status change emails).
  - Background batch ingestion for bulk product imports.
  - Celery Beat scheduled task for automated periodic cancellation of stale failed orders.

---

## Application Pages & Routes

### Storefront & Customer Pages

| Route | Type | Description |
|---|---|---|
| `/` | SSR Server Component | Landing page featuring hero banner, categories, demo/featured products, and dynamic metadata. |
| `/products` | SSR + Client Filter | Full product catalog with filters (category, size, color, price range), sorting, and search. |
| `/cart` | Client Component | Cart management screen: modify item quantities, remove items, view item subtotals, proceed to checkout. |
| `/orders` | SSR + Client | Customer order history list with status badges, pagination, and retry payment triggers. |
| `/orders/[id]` | SSR + Client | Customer order detail: tracking timeline, items list, payment summary, reorder button, and retry payment button. |
| `/addresses` | Client Component | Address book management: add, edit, remove, and assign default shipping addresses. |
| `/payment-methods` | Client Component | Saved cards list: add new card via Stripe SetupIntent Elements, remove card, set default card. |
| `/payment/success` | Client Component | Checkout success confirmation page with order receipt link. |
| `/payment/failed` | Client Component | Checkout failure page showing decline reasons and a retry payment trigger. |

### Authentication Pages (`(auth)`)

| Route | Type | Description |
|---|---|---|
| `/login` | Client Component | User login form with credentials and Google OAuth, plus remember-me checkbox. |
| `/register` | Client Component | Account registration form with client/server Zod validation. |
| `/forgot-password` | Client Component | Request password reset link by entering registered email address. |
| `/reset-password` | Client Component | Enter new password using token from reset email (`?token=...&email=...`). |
| `/reset-link-expired` | Client Component | Fallback error display when reset token is expired or invalid. |
| `/login/redirect` | Client Component | Intermediary redirector handling OAuth and session synchronization callbacks. |

### Admin Pages (`/admin`) — Desktop Only (Not Responsive)

| Route | Type | Description |
|---|---|---|
| `/admin/products` | SSR + Client | Admin product catalog with inventory alerts, search, filter, edit links, and soft delete. |
| `/admin/products/new` | Client Component | Single product creation with Cloudinary image uploader, variant matrix generator, and SKU auto-generation. |
| `/admin/products/[id]/edit` | Client Component | Edit product details, pricing, descriptions, images, and variant inventory. |
| `/admin/products/bulk-add` | Client Component | Upload Excel (`.xlsx`) or JSON file to batch create or update products via background Celery tasks. |
| `/admin/orders` | SSR + Client | Admin order fulfillment list with status filtering (PENDING, PAID, SHIPPED, DELIVERED, CANCELLED). |
| `/admin/orders/[id]` | SSR + Client | Detailed order inspection: change order status, review shipping address, view payment type, trigger stock rollback on cancellation. |

---

## API Endpoints: Main Server (Next.js)

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user account with email, password, and name. |
| `POST` | `/api/auth/forgot-password` | Public | Generate password reset token and dispatch Celery email job. |
| `GET` | `/api/auth/verify-reset` | Public | Validate password reset token and email query parameters. |
| `POST` | `/api/auth/reset-password` | Public | Reset account password using verified token. |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | NextAuth v5 authentication handlers (Credentials, Google OAuth, session check). |

### Products & Catalog

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | Paginated product list with search, sorting, category, price, color, and size filters. |
| `GET` | `/api/products/cursor` | Public | Cursor-based infinite scrolling product feed. |
| `GET` | `/api/demo-products` | Public | Retrieve curated demo / featured products for homepage. |
| `GET` | `/api/categories` | Public | Retrieve all product categories. |

### Cart Management (`/api/cart`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | User | Get current user's persistent cart items. |
| `POST` | `/api/cart` | User | Add an item variant to cart or increment quantity. |
| `PUT` | `/api/cart` | User | Update quantity of a specific cart item. |
| `DELETE` | `/api/cart` | User | Remove an item variant from cart. |
| `GET` | `/api/cart/count` | User | Return total item count for cart badge. |
| `POST` | `/api/cart/validate` | User | Validate variant stock availability for all items currently in cart. |

### Orders & Checkout (`/api/orders`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders` | User | Retrieve paginated order history for current user. |
| `POST` | `/api/orders` | User | Create a new order (supports COD and Stripe PaymentIntent). |
| `GET` | `/api/orders/[id]` | User | Get details for a specific customer order. |
| `POST` | `/api/orders/[id]/retry-payment` | User | Create new Stripe PaymentIntent for an order in failed/pending payment status. |
| `POST` | `/api/orders/[id]/reorder` | User | Add items from an existing order back into user's cart. |

### Customer Addresses (`/api/addresses`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/addresses` | User | List all saved shipping addresses for current user. |
| `POST` | `/api/addresses` | User | Create a new shipping address. |
| `PUT` | `/api/addresses/[id]` | User | Update address details or set as default. |
| `DELETE` | `/api/addresses/[id]` | User | Delete a saved shipping address. |

### Stripe Payments (`/api/stripe`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stripe/payment-methods` | User | List saved customer payment cards from Stripe. |
| `POST` | `/api/stripe/payment-methods/[id]` | User | Set a specific payment method as customer's default. |
| `DELETE` | `/api/stripe/payment-methods/[id]` | User | Detach/delete a saved card from customer. |
| `POST` | `/api/stripe/setup-intent` | User | Create Stripe SetupIntent to securely collect card details via Stripe Elements. |
| `POST` | `/api/stripe/webhook` | Stripe | Webhook handler for `payment_intent.succeeded` and `payment_intent.payment_failed`. |

### In-App Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | User | Fetch recent notifications and unread count for current user. |
| `POST` | `/api/notifications/read` | User | Mark all notifications or a specific notification as read. |

### Internal Server-to-Server (`/api/internal`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/internal/socket-notify` | Secret | Bridge endpoint used by Job Scheduler to push real-time Socket.IO notifications to clients. |

### Admin Endpoints (`/api/admin`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/products` | Admin | List all products with admin filters, deleted status, and stock totals. |
| `POST` | `/api/admin/products` | Admin | Create a new product with multiple variants, images, and SKUs. |
| `GET` | `/api/admin/products/[id]` | Admin | Get full product detail including all variants and soft-deleted state. |
| `PUT` | `/api/admin/products/[id]` | Admin | Update product details, categories, descriptions, images, and variants. |
| `DELETE` | `/api/admin/products/[id]` | Admin | Soft-delete a product and its associated variants. |
| `POST` | `/api/admin/products/bulk-upload` | Admin | Dispatch bulk product create/update payload to FastAPI Job Scheduler. |
| `GET` | `/api/admin/products/template` | Admin | Download sample Excel template for bulk product upload. |
| `POST` | `/api/admin/products/validate-skus` | Admin | Validate array of candidate SKUs for collisions. |
| `GET` | `/api/admin/products/next-sku` | Admin | Generate candidate SKU based on product name, color, and size. |
| `GET` | `/api/admin/orders` | Admin | List customer orders with status filters, customer search, and pagination. |
| `GET` | `/api/admin/orders/[id]` | Admin | View order fulfillment details, shipping address, and line items. |
| `PUT` | `/api/admin/orders/[id]` | Admin | Update order status (triggers customer email and restores stock if cancelled). |
| `POST` | `/api/admin/upload` | Admin | Upload images directly to Cloudinary and receive CDN URLs. |
| `GET` | `/api/admin/colors-sizes` | Admin | Get available color hex codes and size options for variant matrix. |

---

## API Endpoints: Job Scheduler Microservice (FastAPI)

Base URL: `http://localhost:8000` (or `JOB_SCHEDULER_URL`)  
Authentication: Protected endpoints require header `X-Scheduler-Secret: <JOB_SCHEDULER_SECRET>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service health check returning `{"status": "ok", "service": "cart-attack-job-scheduler"}`. |
| `POST` | `/api/v1/jobs/forgot-password` | Secret | Dispatches `send_forgot_password_email_task` Celery task with reset token. |
| `POST` | `/api/v1/jobs/order-status-email` | Secret | Dispatches `send_order_status_email_task` Celery task to notify customer of status change. |
| `POST` | `/api/v1/jobs/bulk-products-upload` | Secret | Dispatches `process_bulk_products_task` (action=`create`) to asynchronously insert product batches. |
| `PATCH` | `/api/v1/jobs/bulk-products-upload` | Secret | Dispatches `process_bulk_products_task` (action=`update`) to asynchronously update products matched by SKU. |
| `POST` | `/api/v1/jobs/trigger-order-cancellation` | Secret | Manually triggers `cancel_stale_failed_orders_task` Celery task. |

### Background Tasks & Celery Beat Schedule

- **`cancel_stale_failed_orders_task`**: Inspects orders with failed or pending payments exceeding timeout window, cancels them, restores variant inventory stock, and emits notification.
- **Beat Schedule**: Runs periodically every `ORDER_CANCELLATION_INTERVAL_MINUTES` (configured in `celery_app.py`, default: every 15 minutes).

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cart_attack"
AUTH_SECRET="your-auth-secret"
APP_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# App Environment
NEXT_PUBLIC_APP_ENV="dev"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# FastAPI Job Scheduler Service
JOB_SCHEDULER_URL="http://localhost:8000"
JOB_SCHEDULER_SECRET="job-scheduler-secret"

# WebSockets
NEXT_PUBLIC_SOCKET_ENABLED="true"
```

Job Scheduler `.env` in `job-schedular/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cart_attack"
REDIS_URL="redis://localhost:6379/0"
APP_URL="http://localhost:3000"
INTERNAL_API_SECRET="internal-api-secret"
JOB_SCHEDULER_SECRET="job-scheduler-secret"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
ORDER_CANCELLATION_INTERVAL_MINUTES=15
```

---

## Setup & Running Locally

### 1. Database & Next.js Server

```bash
# Install dependencies
npm install

# Apply database migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Run Next.js application with Socket.IO server
npm run dev
```

The application will be available at `http://localhost:3000`.

### 2. Job Scheduler Service (FastAPI + Celery)

```bash
cd job-schedular

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Terminal 1: Start FastAPI server
uvicorn main:app --reload --port 8000

# Terminal 2: Start Celery worker
celery -A celery_app.celery_app worker --loglevel=info

# Terminal 3: Start Celery Beat (Periodic scheduler)
celery -A celery_app.celery_app beat --loglevel=info
```
