import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5432/cart-attack")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:3000")
    
    @property
    def primary_app_url(self) -> str:
        if not self.APP_URL:
            return "http://localhost:3000"
        urls = [u.strip() for u in self.APP_URL.split(",") if u.strip()]
        if not urls:
            return "http://localhost:3000"
        if os.getenv("APP_ENV") == "production":
            for u in urls:
                if "vercel.app" in u or "https://" in u:
                    return u
        return urls[0]
    
    ORDER_CANCELLATION_INTERVAL_MINUTES: int = int(os.getenv("ORDER_CANCELLATION_INTERVAL_MINUTES", "15"))
    
    SECRET_KEY: str = os.getenv("JOB_SCHEDULER_SECRET", "cart-attack-job-scheduler-secret")

    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
