from celery import Celery
from celery.schedules import crontab
from core.config import settings

celery_app = Celery(
    "cart_attack_scheduler",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "tasks.email_tasks",
        "tasks.order_tasks",
        "tasks.product_tasks"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "cancel-failed-orders-periodic": {
            "task": "tasks.order_tasks.cancel_stale_failed_orders_task",
            "schedule": crontab(minute=f"*/{settings.ORDER_CANCELLATION_INTERVAL_MINUTES}"),
        },
    }
)

