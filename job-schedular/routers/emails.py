from fastapi import APIRouter, Depends, status
from schemas.jobs import ForgotPasswordEmailRequest, OrderStatusEmailRequest
from tasks.email_tasks import (
    send_forgot_password_email_task,
    send_order_status_email_task,
)
from core.security import verify_scheduler_secret

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Email Jobs"],
    dependencies=[Depends(verify_scheduler_secret)],
)


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Forgot Password Email",
    description="Dispatches a Celery task to send password reset instructions to a user email.",
)
def trigger_forgot_password_email(payload: ForgotPasswordEmailRequest):
    task = send_forgot_password_email_task.delay(
        user_email=payload.user_email,
        reset_token=payload.reset_token,
    )
    return {"status": "queued", "task_id": task.id}


@router.post(
    "/order-status-email",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Order Status Email",
    description="Dispatches a Celery task to send order status update notification to customer.",
)
def trigger_order_status_email(payload: OrderStatusEmailRequest):
    task = send_order_status_email_task.delay(order_id=payload.order_id)
    return {"status": "queued", "task_id": task.id}
