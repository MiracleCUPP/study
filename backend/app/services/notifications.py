import json

from ..extensions import db
from ..models import Notification
from .webpush import send_push_to_user


def create_notification(user_id, kind, title, body, link="", payload=None, dedupe_key=None):
    if dedupe_key:
        exists = Notification.query.filter_by(dedupe_key=dedupe_key).first()
        if exists:
            return exists

    item = Notification(
        user_id=user_id,
        kind=kind,
        title=title,
        body=body,
        link=link or "",
        payload_json=json.dumps(payload or {}, ensure_ascii=False),
        dedupe_key=dedupe_key
    )
    db.session.add(item)
    db.session.commit()

    send_push_to_user(
        user_id=user_id,
        title=title,
        body=body,
        link=link,
        payload=payload
    )

    return item


def notify_schedule_change(lesson):
    create_notification(
        lesson.student_id,
        "schedule_changed",
        "Расписание изменено",
        f"Занятие «{lesson.subject}» перенесено или обновлено.",
        link="/student/schedule"
    )
