import os

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import PushSubscription
from ..security import login_required

bp = Blueprint("push", __name__, url_prefix="/api/push")


@bp.get("/public-key")
@login_required
def public_key():
    key = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    return jsonify({
        "publicKey": key,
        "configured": bool(key)
    })


@bp.post("/subscribe")
@login_required
def subscribe():
    data = request.get_json(silent=True) or {}
    endpoint = str(data.get("endpoint", "")).strip()
    keys = data.get("keys") or {}
    p256dh = str(keys.get("p256dh", "")).strip()
    auth_key = str(keys.get("auth", "")).strip()

    if not endpoint or not p256dh or not auth_key:
        return jsonify({"error": "Некорректная push-подписка"}), 400

    item = PushSubscription.query.filter_by(endpoint=endpoint).first()

    if item:
        item.user_id = g.user.id
        item.p256dh = p256dh
        item.auth = auth_key
        item.user_agent = request.headers.get("User-Agent", "")[:500]
        item.is_active = True
    else:
        item = PushSubscription(
            user_id=g.user.id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth_key,
            user_agent=request.headers.get("User-Agent", "")[:500],
            is_active=True
        )
        db.session.add(item)

    db.session.commit()

    return jsonify({"ok": True})


@bp.post("/unsubscribe")
@login_required
def unsubscribe():
    data = request.get_json(silent=True) or {}
    endpoint = str(data.get("endpoint", "")).strip()

    if endpoint:
        item = PushSubscription.query.filter_by(
            endpoint=endpoint,
            user_id=g.user.id
        ).first()
        if item:
            item.is_active = False
            db.session.commit()

    return jsonify({"ok": True})
