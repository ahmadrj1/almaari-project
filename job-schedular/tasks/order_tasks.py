import uuid
import json
from celery_app import celery_app
from core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime, timedelta

@celery_app.task(name="tasks.order_tasks.cancel_stale_failed_orders_task", bind=True)
def cancel_stale_failed_orders_task(self):
    db = SessionLocal()
    try:
        threshold_time = datetime.utcnow() - timedelta(hours=120)
        
        # Select target orders
        select_query = text("""
            SELECT id, "userId" FROM "Order"
            WHERE "paymentStatus" = 'FAILED'
              AND status != 'CANCELLED'
              AND "updatedAt" <= :threshold_time
        """)
        stale_orders = db.execute(select_query, {"threshold_time": threshold_time}).fetchall()
        
        cancelled_count = 0
        for row in stale_orders:
            order_id = row.id
            user_id = row.userId
            
            # Restock items in order
            restock_query = text("""
                UPDATE "ProductVariant"
                SET stock = "ProductVariant".stock + oi.quantity
                FROM "OrderItem" oi
                JOIN "Color" c ON c.name = oi."colorName"
                JOIN "Size" s ON s.name = oi."sizeName"
                WHERE oi."orderId" = :order_id
                  AND "ProductVariant"."productId" = oi."productId"
                  AND "ProductVariant"."colorId" = c.id
                  AND "ProductVariant"."sizeId" = s.id
            """)
            db.execute(restock_query, {"order_id": order_id})

            update_query = text("""
                UPDATE "Order"
                SET status = 'CANCELLED', "updatedAt" = NOW()
                WHERE id = :order_id
            """)
            db.execute(update_query, {"order_id": order_id})

            # Create in-app notification for user
            if user_id:
                notif_id = str(uuid.uuid4())
                notif_query = text("""
                    INSERT INTO "Notification" (id, "userId", type, title, message, "isRead", metadata, "createdAt")
                    VALUES (:id, :user_id, :type, :title, :message, false, CAST(:metadata AS jsonb), NOW())
                """)
                db.execute(
                    notif_query,
                    {
                        "id": notif_id,
                        "user_id": user_id,
                        "type": "ORDER_STATUS_UPDATED",
                        "title": "Order Cancelled — Payment Failed",
                        "message": f"All payment attempts failed for order #{order_id[:8]}. Stock has been restored and the order cancelled.",
                        "metadata": json.dumps({"orderId": order_id, "status": "CANCELLED"}),
                    },
                )

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

            # Dispatch notification email task for cancelled order
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
