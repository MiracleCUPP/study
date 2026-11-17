from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify
from sqlalchemy import func

from ..extensions import db
from ..models import Lesson, User
from ..security import tutor_required

bp = Blueprint("stats", __name__, url_prefix="/api/stats")


def period_stats(since):
    count = (
        db.session.query(func.count(Lesson.id))
        .filter(Lesson.status == "completed", Lesson.start_at >= since)
        .scalar()
        or 0
    )

    revenue = (
        db.session.query(func.coalesce(func.sum(Lesson.price_rub), 0))
        .filter(Lesson.status == "completed", Lesson.start_at >= since)
        .scalar()
        or 0
    )

    return {
        "lessons": int(count),
        "revenueRub": float(revenue)
    }


@bp.get("")
@tutor_required
def stats():
    now = datetime.now(timezone.utc)

    students = User.query.filter_by(role="student", is_active=True).order_by(User.last_name, User.first_name).all()

    return jsonify({
        "week": period_stats(now - timedelta(days=7)),
        "month": period_stats(now - timedelta(days=30)),
        "year": period_stats(now - timedelta(days=365)),
        "students": [
            {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "grade": student.grade,
                "lessonPriceRub": float(student.lesson_price_rub or 0)
            }
            for student in students
        ]
    })
