from flask import Blueprint, jsonify, request

from ..extensions import db, limiter
from ..models import DemoRequest

bp = Blueprint("public", __name__, url_prefix="/api/public")


@bp.post("/demo-request")
@limiter.limit("5 per hour")
def create_demo_request():
    data = request.get_json(silent=True) or {}

    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    contact = str(data.get("contact", "")).strip()
    grade = data.get("grade")

    try:
        grade = int(grade)
    except Exception:
        grade = 0

    if not first_name or not last_name or not contact or grade not in {5, 6, 7, 8, 9}:
        return jsonify({"error": "Заполните ФИО, контакт и класс"}), 400

    item = DemoRequest(
        first_name=first_name,
        last_name=last_name,
        contact=contact,
        grade=grade
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"ok": True, "id": item.id}), 201
