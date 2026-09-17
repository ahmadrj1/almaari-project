from fastapi import APIRouter, Depends, status
from tasks.order_tasks import cancel_stale_failed_orders_task
from core.security import verify_scheduler_secret

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Order Jobs"],
    dependencies=[Depends(verify_scheduler_secret)],
)


@router.post(
    "/trigger-order-cancellation",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Stale Order Cancellation",
    description="Dispatches a Celery task to inspect and cancel stale orders with failed payment status.",
)
def manual_trigger_order_cancellation():
    task = cancel_stale_failed_orders_task.delay()
    return {"status": "queued", "task_id": task.id}
