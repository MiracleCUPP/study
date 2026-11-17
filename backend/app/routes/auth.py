import secrets

from flask import Blueprint, g, jsonify, request, session

from ..extensions import limiter
from ..models import User
from ..security import login_required, verify_password
from ..serializers import user_public

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
@limiter.limit("5 per minute; 20 per hour")
def login():
    data = request.get_json(silent=True) or {}
    login_value = str(data.get("login", "")).strip()
    password = str(data.get("password", ""))

    user = User.query.filter_by(login=login_value).first()

    if not user or not user.is_active or not verify_password(user.password_hash, password):
        return jsonify({"error": "Неверный логин или пароль"}), 401

    session.clear()
    session["user_id"] = user.id
    session["csrf_token"] = secrets.token_urlsafe(32)
    session.permanent = True

    result = user_public(user, include_price=user.role == "tutor")
    result["csrfToken"] = session["csrf_token"]
    return jsonify(result)


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@bp.get("/me")
@login_required
def me():
    if not session.get("csrf_token"):
        session["csrf_token"] = secrets.token_urlsafe(32)
    result = user_public(g.user, include_price=g.user.role == "tutor")
    result["csrfToken"] = session["csrf_token"]
    return jsonify(result)
