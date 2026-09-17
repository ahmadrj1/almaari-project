import os
import requests
from core.config import settings


def dispatch_socket_notification(payload: dict) -> bool:
    """
    Dispatches a real-time socket notification to Next.js /api/internal/socket-notify.
    Compatible with both real-time Socket.IO and polling fallback:
    - If Next.js socket server is active, it emits instant real-time events.
    - If socket server is unreachable or sockets are disabled, this fails silently
      because the notification is already committed to PostgreSQL, ensuring
      polling clients receive it on their next poll.
    """
    candidates = []
    if os.getenv("APP_ENV") == "dev":
        candidates.append("http://localhost:3000")

    primary = settings.primary_app_url
    if primary and primary not in candidates:
        candidates.append(primary)

    for base_url in candidates:
        try:
            url = f"{base_url.rstrip('/')}/api/internal/socket-notify"
            resp = requests.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.SECRET_KEY}"},
                timeout=2,
            )
            if resp.status_code == 200:
                return True
        except Exception:
            continue

    return False
