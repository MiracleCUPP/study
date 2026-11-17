import json
import os
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app import create_app
from app.extensions import db
from app.models import Lesson, Notification, User
from app.services.notifications import create_notification
from app.services.schedule import ensure_recurring_horizon


app = create_app()
timezone_name = os.getenv("APP_TIMEZONE", "Asia/Novosibirsk")
local_tz = ZoneInfo(timezone_name)
promo_hour = int(os.getenv("PROMO_HOUR", "12"))
_last_recurring_refresh = None


def promo_notifications():
    now_local = datetime.now(local_tz)

    if now_local.hour < promo_hour:
        return

    day_key = now_local.date().isoformat()
    students = User.query.filter_by(role="student", is_active=True).all()

    for student in students:
        create_notification(
            student.id,
            "promo",
            "Приведи друга — скидка 50%",
            "Приведи друга и получи скидку 50% на занятие. Приглашённому ученику — скидка 25% на первое занятие.",
            link="/student",
            payload={
                "studentDiscount": 50,
                "friendFirstLessonDiscount": 25
            },
            dedupe_key=f"promo-{student.id}-{day_key}"
        )


def lesson_reminders():
    now = datetime.now(timezone.utc)
    until = now + timedelta(minutes=61)

    lessons = (
        Lesson.query
        .filter(
            Lesson.status.in_(["planned", "transferred"]),
            Lesson.start_at > now,
            Lesson.start_at <= until
        )
        .all()
    )

    for lesson in lessons:
        minutes_left = (lesson.start_at - now).total_seconds() / 60

        windows = [
            (60, 59.0, 60.5),
            (30, 29.0, 30.5),
            (5, 4.0, 5.5)
        ]

        for label, minimum, maximum in windows:
            if minimum <= minutes_left <= maximum:
                link = lesson.meeting_link if label == 5 else ""
                payload = {
                    "lessonId": lesson.id,
                    "meetingLink": lesson.meeting_link if label == 5 else ""
                }

                body = (
                    f"Занятие по предмету «{lesson.subject}» начнётся через {label} минут."
                    if label != 5
                    else f"Занятие по предмету «{lesson.subject}» начнётся через 5 минут. Ссылка на занятие уже доступна."
                )

                create_notification(
                    lesson.student_id,
                    f"lesson_{label}",
                    f"Занятие через {label} минут",
                    body,
                    link=link,
                    payload=payload,
                    dedupe_key=f"lesson-{lesson.id}-reminder-{label}"
                )


def run_jobs():
    global _last_recurring_refresh
    with app.app_context():
        now = datetime.now(timezone.utc)
        if _last_recurring_refresh is None or (now - _last_recurring_refresh).total_seconds() >= 3600:
            ensure_recurring_horizon(days=120)
            _last_recurring_refresh = now
        promo_notifications()
        lesson_reminders()


if __name__ == "__main__":
    while True:
        try:
            run_jobs()
        except Exception as error:
            print(f"Scheduler error: {error}", flush=True)

        time.sleep(20)
