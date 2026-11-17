import json
import os

from pywebpush import WebPushException, webpush

from ..extensions import db
from ..models import PushSubscription


def push_configured():
    return bool(
        os.getenv("VAPID_PUBLIC_KEY", "").strip()
        and os.getenv("VAPID_PRIVATE_KEY_FILE", "").strip()
        and os.path.exists(os.getenv("VAPID_PRIVATE_KEY_FILE", ""))
    )


def send_push_to_user(user_id, title, body, link="", payload=None):
    if not push_configured():
        return

    subscriptions = PushSubscription.query.filter_by(
        user_id=user_id,
        is_active=True
    ).all()

    if not subscriptions:
        return

    data = json.dumps({
        "title": title,
        "body": body,
        "link": link or "/",
        "payload": payload or {}
    }, ensure_ascii=False)

    private_key = os.getenv("VAPID_PRIVATE_KEY_FILE")
    subject = os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")

    changed = False

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth
                    }
                },
                data=data,
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
                ttl=3600
            )
        except WebPushException as error:
            status_code = getattr(getattr(error, "response", None), "status_code", None)
            if status_code in {404, 410}:
                subscription.is_active = False
                changed = True
        except Exception:
            continue

    if changed:
        db.session.commit()
