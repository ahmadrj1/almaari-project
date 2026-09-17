from fastapi import APIRouter, status

router = APIRouter(tags=["Health Check"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns service health status to verify the Job Scheduler API is running.",
)
def health_check():
    return {"status": "ok", "service": "cart-attack-job-scheduler"}
