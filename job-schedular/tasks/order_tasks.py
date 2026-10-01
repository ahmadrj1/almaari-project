import uuid
from datetime import datetime, timedelta
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from models import Order, ProductVariant, Color, Size, Notification


@celery_app.task(name="tasks.order_tasks.cancel_stale_failed_orders_task", bind=True)
def cancel_stale_failed_orders_task(self):
    db = SessionLocal()
    try:
        threshold_time = datetime.utcnow() - timedelta(hours=120)

        stale_orders = (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(
                Order.paymentStatus == "FAILED",
                Order.status != "CANCELLED",
                Order.updatedAt <= threshold_time,
            )
            .all()
        )

        cancelled_count = 0
        for order in stale_orders:
            order_id = order.id
            user_id = order.userId

            # Restock items in order
            for item in order.items:
                color = db.query(Color).filter(func.lower(Color.name) == func.lower(item.colorName.strip())).first()
                size = db.query(Size).filter(func.lower(Size.name) == func.lower(item.sizeName.strip())).first()
                if color and size:
                    variant = (
                        db.query(ProductVariant)
                        .filter(
                            ProductVariant.productId == item.productId,
                            ProductVariant.colorId == color.id,
                            ProductVariant.sizeId == size.id,
                        )
                        .first()
                    )
                    if variant:
                        variant.stock = variant.stock + item.quantity

            order.status = "CANCELLED"
            order.updatedAt = datetime.utcnow()

            notif_id = str(uuid.uuid4())
            if user_id:
                notif = Notification(
                    id=notif_id,
                    userId=user_id,
                    type="ORDER_STATUS_UPDATED",
                    title="Order Cancelled — Payment Failed",
                    message=f"All payment attempts failed for order #{order_id[:8]}. Stock has been restored and the order cancelled.",
                    notif_metadata={"orderId": order_id, "status": "CANCELLED"},
                    createdAt=datetime.utcnow(),
                )
                db.add(notif)

            db.commit()
            cancelled_count += 1

            if user_id:
                from services.notification_service import dispatch_socket_notification
                dispatch_socket_notification({
                    "userId": user_id,
                    "type": "user",
                    "notification": {
                        "id": notif_id,
                        "userId": user_id,
                        "type": "ORDER_STATUS_UPDATED",
                        "title": "Order Cancelled — Payment Failed",
                        "message": f"All payment attempts failed for order #{order_id[:8]}. Stock has been restored and the order cancelled.",
                        "metadata": {"orderId": order_id, "status": "CANCELLED"},
                        "isRead": False,
                    },
                })

            from tasks.email_tasks import send_order_status_email_task
            send_order_status_email_task.delay(order_id=order_id)

        print(f"[ORDER CLEANUP] Cancelled {cancelled_count} stale orders with FAILED payment status older than 120 hours.")
        return {"cancelled_count": cancelled_count, "processed_at": datetime.utcnow().isoformat()}

    except Exception as exc:
        db.rollback()
        print(f"[ORDER CLEANUP ERROR] {str(exc)}")
        raise exc
    finally:
        db.close()
