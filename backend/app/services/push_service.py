import json
import logging

from pywebpush import webpush, WebPushException

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger(__name__)


def send_push(subscription: PushSubscription, title: str, body: str) -> bool:
    """Sends one Web Push notification. Returns False (and lets the caller
    delete the subscription) when the browser has permanently revoked it."""
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth_key},
            },
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status in (404, 410):
            return False  # subscription expired/unsubscribed - safe to delete
        logger.warning("Push send failed (status=%s): %s", status, exc)
        return True  # transient error - keep the subscription, retry next tick
