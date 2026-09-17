from .health import router as health_router
from .emails import router as emails_router
from .products import router as products_router
from .orders import router as orders_router

__all__ = [
    "health_router",
    "emails_router",
    "products_router",
    "orders_router",
]
