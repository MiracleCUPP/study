from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import DemoRequest
from ..security import tutor_required

bp = Blueprint("demo_requests", __name__, url_prefix="/api/demo-requests")


@bp.get("")
@tutor_required
def list_requests():
    items = DemoRequest.query.order_by(DemoRequest.created_at.desc()).all()
    return jsonify([
        {
            "id": item.id,
            "firstName": item.first_name,
            "lastName": item.last_name,
            "grade": item.grade,
            "contact": item.contact,
            "status": item.status,
            "createdAt": item.created_at.isoformat()
        }
        for item in items
    ])


@bp.patch("/<int:request_id>")
@tutor_required
def update_request(request_id):
    item = db.session.get(DemoRequest, request_id)

    if not item:
        return jsonify({"error": "Заявка не найдена"}), 404

    status = str((request.get_json(silent=True) or {}).get("status", "")).strip()

    if status not in {"new", "contacted", "archived"}:
        return jsonify({"error": "Некорректный статус"}), 400

    item.status = status
    db.session.commit()

    return jsonify({"status": status})
