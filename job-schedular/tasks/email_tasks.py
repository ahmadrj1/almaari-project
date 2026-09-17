from celery_app import celery_app
from services.email_service import send_email, render_template
from core.database import SessionLocal
from core.config import settings
from sqlalchemy import text
from datetime import datetime

@celery_app.task(name="tasks.email_tasks.send_forgot_password_email_task", bind=True, max_retries=3)
def send_forgot_password_email_task(self, user_email: str, reset_token: str):
    try:
        reset_url = f"{settings.primary_app_url}/api/auth/verify-reset?token={reset_token}"
        html_content = render_template("forgot_password_email.html", {
            "reset_url": reset_url,
            "current_year": datetime.now().year,
            "app_url": settings.primary_app_url,
        })
        send_email(to_email=user_email, subject="Reset Your Password - Almaari", html_content=html_content)
        return {"status": "success", "email": user_email}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(name="tasks.email_tasks.send_order_status_email_task", bind=True, max_retries=3)
def send_order_status_email_task(self, order_id: str):
    db = SessionLocal()
    try:
        # Fetch order details with User and Address
        order_query = text("""
            SELECT o.id, o.status, o."subTotal", o.tax, o.total, o."createdAt", o."paymentMethod", o."paymentStatus",
                   u.id as user_id, u."fullName", u.email,
                   a.street, a.city, a.country, a."zipCode"
            FROM "Order" o
            JOIN "User" u ON o."userId" = u.id
            LEFT JOIN "Address" a ON o."addressId" = a.id
            WHERE o.id = :order_id
        """)
        order_res = db.execute(order_query, {"order_id": order_id}).fetchone()
        if not order_res:
            print(f"[ORDER EMAIL] Order {order_id} not found.")
            return {"status": "not_found", "order_id": order_id}

        # Fetch Order Items
        items_query = text("""
            SELECT oi.id, oi.quantity, oi.price, oi."colorName", oi."sizeName",
                   p.title, p.image
            FROM "OrderItem" oi
            JOIN "Product" p ON oi."productId" = p.id
            WHERE oi."orderId" = :order_id
        """)
        items_res = db.execute(items_query, {"order_id": order_id}).fetchall()

        items = [
            {
                "id": row.id,
                "quantity": row.quantity,
                "price": float(row.price),
                "colorName": row.colorName,
                "sizeName": row.sizeName,
                "title": row.title,
                "image": row.image,
            }
            for row in items_res
        ]

        order_dict = {
            "id": order_res.id,
            "status": order_res.status,
            "subTotal": float(order_res.subTotal),
            "tax": float(order_res.tax),
            "total": float(order_res.total),
            "createdAt": order_res.createdAt,
            "paymentMethod": order_res.paymentMethod,
            "paymentStatus": order_res.paymentStatus,
        }

        user_dict = {
            "fullName": order_res.fullName,
            "email": order_res.email,
        }

        address_dict = {
            "street": order_res.street,
            "city": order_res.city,
            "country": order_res.country,
            "zipCode": order_res.zipCode,
        } if order_res.street else None

        email_headline = f"Your order status is now '{order_res.status}'."
        if order_res.status == "PENDING" and order_res.paymentStatus in ("PENDING", "PROCESSING"):
            if order_res.paymentMethod == "CASH_ON_DELIVERY":
                email_headline = "Thank you for placing your order with Almaari! Payment will be collected upon delivery."
            else:
                email_headline = "Thank you for placing your order with Almaari! Your payment is being processed."
        elif order_res.status == "PROCESSING":
            email_headline = "Payment confirmed! Your order is now being processed."
        elif order_res.status == "DELIVERED":
            email_headline = "Your order has been successfully delivered!"
        elif order_res.status == "CANCELLED" and order_res.paymentStatus == "FAILED":
            email_headline = "Unfortunately, all payment attempts failed and your order has been cancelled. Your stock reservation has been cleared out."
        elif order_res.status == "CANCELLED":
            email_headline = "Your order has been cancelled."
        elif order_res.paymentStatus == "FAILED":
            email_headline = "Your recent payment attempt was declined. Stripe will retry automatically, or you can retry payment yourself anytime within the next 5 days."

        html_content = render_template("order_status_email.html", {
            "order": order_dict,
            "user": user_dict,
            "address": address_dict,
            "items": items,
            "email_headline": email_headline,
            "app_url": settings.primary_app_url,
        })

        subject = f"Order #{order_res.id} Update: {order_res.status}"
        send_email(to_email=order_res.email, subject=subject, html_content=html_content)
        return {"status": "success", "order_id": order_id}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
