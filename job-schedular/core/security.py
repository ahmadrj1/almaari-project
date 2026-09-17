from fastapi import Header, HTTPException, status
from .config import settings


async def verify_scheduler_secret(
    x_scheduler_secret: str = Header(default=""),
) -> None:
    if x_scheduler_secret != settings.SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid scheduler secret",
        )
