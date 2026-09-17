# Almaari Job Scheduler

FastAPI + Celery + Redis background job scheduler for Almaari e-commerce platform.

## Features

1. **Forgot Password Email Queue**: Asynchronous password reset email worker.
2. **Order Status Email Queue**: Asynchronous email worker rendering fixed HTML template with full order summary (products, variants, pricing breakdown, shipping address, status updates).
3. **Periodic Order Cancellation (Celery Beat)**: Scheduled cron job running every hour that cancels orders with `paymentStatus = FAILED` older than 120 hours (5 days), creates an in-app notification for the customer, restores variant stocks, and dispatches a notification email.
4. **Bulk Product Upload Flow**: Queues batch ingestion of products parsed by Next.js server (JSON/CSV files & image attachments) and gradually creates products, categories, colors, sizes, variants, and product images in PostgreSQL database.

## Prerequisites

- Python 3.9+
- Redis server running on `redis://localhost:6379/0`
- PostgreSQL database

## Setup Instructions

1. Activate virtual environment:
```bash
cd job-schedular
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env` (or copy from `.env.example`):
```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/cart-attack"
REDIS_URL="redis://localhost:6379/0"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-app-password"
APP_URL="url-1,url-2"
ORDER_CANCELLATION_INTERVAL_MINUTES=15
JOB_SCHEDULER_SECRET="job-scheduler-secret"
NGROK_AUTHTOKEN=""
NGROK_DOMAIN=""
TEMPLATE_GENERATION_INTERVAL_HOURS=1
APP_ENV="dev"
```
> **Note**: `APP_URL` supports comma-separated URLs for allowed CORS origins in FastAPI.

## Running Services

### 1. Run FastAPI Web Server
```bash
uvicorn main:app --reload --port 8000
```
API Documentation available at `http://localhost:8000/docs`.

### 2. Run Celery Worker
```bash
celery -A celery_app.celery_app worker --loglevel=info
```

### 3. Run Celery Beat Scheduler (Periodic Jobs)
```bash
celery -A celery_app.celery_app beat --loglevel=info
```

## API Endpoints

- `GET /health`: Health check
- `POST /api/v1/jobs/forgot-password`: Queue forgot password email
- `POST /api/v1/jobs/order-status-email`: Queue order status change email
- `POST /api/v1/jobs/bulk-products-upload`: Queue bulk product import
- `POST /api/v1/jobs/trigger-order-cancellation`: Manually trigger 120-hour failed order cleanup
