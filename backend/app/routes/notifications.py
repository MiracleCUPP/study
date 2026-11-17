from flask import Blueprint, g, jsonify

from ..extensions import db
from ..models import Notification
from ..security import login_required
from ..serializers import notification_public

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@bp.get("")
@login_required
def list_notifications():
    items = (
        Notification.query
        .filter_by(user_id=g.user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([notification_public(item) for item in items])


@bp.patch("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    item = db.session.get(Notification, notification_id)

    if not item or item.user_id != g.user.id:
        return jsonify({"error": "Уведомление не найдено"}), 404

    item.is_read = True
    db.session.commit()
    return jsonify({"ok": True})


@bp.patch("/read-all")
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=g.user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True})
