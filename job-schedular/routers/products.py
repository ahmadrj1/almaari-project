from fastapi import APIRouter, Depends, status
from schemas.jobs import BulkProductUploadRequest
from tasks.product_tasks import process_bulk_products_task
from core.security import verify_scheduler_secret

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Product Jobs"],
    dependencies=[Depends(verify_scheduler_secret)],
)


@router.post(
    "/bulk-products-upload",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Bulk Product Upload (Create)",
    description="Dispatches a Celery task to process and ingest a batch of new product items.",
)
def trigger_bulk_products_upload(payload: BulkProductUploadRequest):
    products_dict = [
        p.model_dump() if hasattr(p, "model_dump") else p.dict()
        for p in payload.products
    ]
    task = process_bulk_products_task.delay(products_data=products_dict, action="create")
    return {
        "status": "queued",
        "action": "create",
        "task_id": task.id,
        "total_products": len(products_dict),
    }


@router.patch(
    "/bulk-products-upload",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Bulk Product Upload (Update)",
    description="Dispatches a Celery task to update existing product items matched by SKU.",
)
def trigger_bulk_products_update(payload: BulkProductUploadRequest):
    products_dict = [
        p.model_dump() if hasattr(p, "model_dump") else p.dict()
        for p in payload.products
    ]
    task = process_bulk_products_task.delay(products_data=products_dict, action="update")
    return {
        "status": "queued",
        "action": "update",
        "task_id": task.id,
        "total_products": len(products_dict),
    }
