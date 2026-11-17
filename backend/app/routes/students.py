from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import User
from ..security import hash_password, tutor_required, validate_password
from ..serializers import user_public

bp = Blueprint("students", __name__, url_prefix="/api/students")


def timezone_ok(value):
    try:
        ZoneInfo(value)
        return True
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return False


@bp.get("")
@tutor_required
def list_students():
    students = User.query.filter_by(role="student", is_active=True).order_by(User.last_name, User.first_name).all()
    return jsonify([user_public(item, include_price=True) for item in students])


@bp.post("")
@tutor_required
def create_student():
    data = request.get_json(silent=True) or {}

    login_value = str(data.get("login", "")).strip()
    password = str(data.get("password", ""))
    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    city = str(data.get("city", "")).strip()
    timezone_name = str(data.get("timezone", "")).strip()

    try:
        grade = int(data.get("grade"))
    except Exception:
        grade = 0

    try:
        price = Decimal(str(data.get("lessonPriceRub", "0")))
    except InvalidOperation:
        price = Decimal("0")

    if not login_value or len(login_value) < 3:
        return jsonify({"error": "Логин должен содержать минимум 3 символа"}), 400

    password_error = validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    if not first_name or not last_name or grade not in {5, 6, 7, 8, 9}:
        return jsonify({"error": "Заполните имя, фамилию и класс"}), 400

    if not city:
        return jsonify({"error": "Укажите город ученика"}), 400

    if not timezone_name or not timezone_ok(timezone_name):
        return jsonify({"error": "Выберите корректный часовой пояс ученика"}), 400

    if price < 0:
        return jsonify({"error": "Стоимость занятия не может быть отрицательной"}), 400

    if User.query.filter_by(login=login_value).first():
        return jsonify({"error": "Такой логин уже существует"}), 409

    user = User(
        login=login_value,
        password_hash=hash_password(password),
        role="student",
        first_name=first_name,
        last_name=last_name,
        grade=grade,
        city=city,
        timezone_name=timezone_name,
        lesson_price_rub=price
    )
    db.session.add(user)
    db.session.commit()

    return jsonify(user_public(user, include_price=True)), 201


@bp.patch("/<int:student_id>")
@tutor_required
def update_student(student_id):
    student = db.session.get(User, student_id)
    if not student or student.role != "student":
        return jsonify({"error": "Ученик не найден"}), 404

    data = request.get_json(silent=True) or {}

    if "lessonPriceRub" in data:
        try:
            price = Decimal(str(data["lessonPriceRub"]))
        except InvalidOperation:
            return jsonify({"error": "Некорректная стоимость"}), 400
        if price < 0:
            return jsonify({"error": "Стоимость не может быть отрицательной"}), 400
        student.lesson_price_rub = price

    if "grade" in data:
        try:
            grade = int(data["grade"])
        except Exception:
            return jsonify({"error": "Некорректный класс"}), 400
        if grade not in {5, 6, 7, 8, 9}:
            return jsonify({"error": "Класс должен быть от 5 до 9"}), 400
        student.grade = grade

    if "city" in data:
        city = str(data.get("city", "")).strip()
        if not city:
            return jsonify({"error": "Город не может быть пустым"}), 400
        student.city = city

    if "timezone" in data:
        timezone_name = str(data.get("timezone", "")).strip()
        if not timezone_ok(timezone_name):
            return jsonify({"error": "Некорректный часовой пояс"}), 400
        student.timezone_name = timezone_name

    if data.get("password"):
        password = str(data["password"])
        password_error = validate_password(password)
        if password_error:
            return jsonify({"error": password_error}), 400
        student.password_hash = hash_password(password)

    db.session.commit()
    return jsonify(user_public(student, include_price=True))
