from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from routers import (
    health_router,
    emails_router,
    products_router,
    orders_router,
)


def _start_ngrok(port: int = 8000):
    authtoken = os.getenv("NGROK_AUTHTOKEN", "").strip()
    if not authtoken:
        return None

    from pyngrok import ngrok, conf
    conf.get_default().auth_token = authtoken

    domain = os.getenv("NGROK_DOMAIN", "").strip()
    options = {"addr": port}
    if domain:
        options["hostname"] = domain

    try:
        tunnel = ngrok.connect(**options)
        print(f"\n🚀 ngrok tunnel: {tunnel.public_url}\n")
        return tunnel
    except Exception as e:
        print(f"\n⚠️  ngrok failed to start: {e}\nRunning without tunnel.\n")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    tunnel = _start_ngrok(port=int(os.getenv("PORT", 8000)))
    yield
    if tunnel:
        from pyngrok import ngrok
        ngrok.disconnect(tunnel.public_url)
        ngrok.kill()


_is_production = os.getenv("APP_ENV") == "production"

app = FastAPI(
    title="Almaari Job Scheduler API",
    version="1.0.0",
    description="FastAPI + Celery + Redis Job Scheduler service",
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request payload"},
    )


_raw_app_urls = os.getenv("APP_URL", "http://localhost:3000")
_allowed_origins = [url.strip() for url in _raw_app_urls.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(emails_router)
app.include_router(products_router)
app.include_router(orders_router)
