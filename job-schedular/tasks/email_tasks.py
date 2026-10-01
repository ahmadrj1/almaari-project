from celery_app import celery_app
from services.email_service import send_email, render_template
from core.database import SessionLocal
from core.config import settings
from datetime import datetime
from sqlalchemy.orm import joinedload
from models import Order, OrderItem


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
        order = (
            db.query(Order)
            .options(
                joinedload(Order.user),
                joinedload(Order.address),
                joinedload(Order.items).joinedload(OrderItem.product),
            )
            .filter(Order.id == order_id)
            .first()
        )

        if not order:
            print(f"[ORDER EMAIL] Order {order_id} not found.")
            return {"status": "not_found", "order_id": order_id}

        items = [
            {
                "id": item.id,
                "quantity": item.quantity,
                "price": float(item.price),
                "colorName": item.colorName,
                "sizeName": item.sizeName,
                "title": item.product.title if item.product else "",
                "image": item.product.image if item.product else "",
            }
            for item in order.items
        ]

        order_dict = {
            "id": order.id,
            "status": order.status,
            "subTotal": float(order.subTotal),
            "tax": float(order.tax),
            "total": float(order.total),
            "createdAt": order.createdAt,
            "paymentMethod": order.paymentMethod,
            "paymentStatus": order.paymentStatus,
        }

        user_dict = {
            "fullName": order.user.fullName if order.user else "",
            "email": order.user.email if order.user else "",
        }

        address_dict = (
            {
                "street": order.address.street,
                "city": order.address.city,
                "country": order.address.country,
                "zipCode": order.address.zipCode,
            }
            if order.address and order.address.street
            else None
        )

        email_headline = f"Your order status is now '{order.status}'."
        if order.status == "PENDING" and order.paymentStatus in ("PENDING", "PROCESSING"):
            if order.paymentMethod == "CASH_ON_DELIVERY":
                email_headline = "Thank you for placing your order with Almaari! Payment will be collected upon delivery."
            else:
                email_headline = "Thank you for placing your order with Almaari! Your payment is being processed."
        elif order.status == "PROCESSING":
            email_headline = "Payment confirmed! Your order is now being processed."
        elif order.status == "DELIVERED":
            email_headline = "Your order has been successfully delivered!"
        elif order.status == "CANCELLED" and order.paymentStatus == "FAILED":
            email_headline = "Unfortunately, all payment attempts failed and your order has been cancelled. Your stock reservation has been cleared out."
        elif order.status == "CANCELLED":
            email_headline = "Your order has been cancelled."
        elif order.paymentStatus == "FAILED":
            email_headline = "Your recent payment attempt was declined. Stripe will retry automatically, or you can retry payment yourself anytime within the next 5 days."

        html_content = render_template("order_status_email.html", {
            "order": order_dict,
            "user": user_dict,
            "address": address_dict,
            "items": items,
            "email_headline": email_headline,
            "app_url": settings.primary_app_url,
        })

        recipient_email = order.user.email if order.user else None
        if recipient_email:
            subject = f"Order #{order.id} Update: {order.status}"
            send_email(to_email=recipient_email, subject=subject, html_content=html_content)

        return {"status": "success", "order_id": order_id}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
