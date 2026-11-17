import json
from datetime import datetime, timezone


def iso(value):
    return value.isoformat() if value else None


def user_public(user, include_price=False):
    data = {
        "id": user.id,
        "login": user.login,
        "role": user.role,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "grade": user.grade,
        "city": user.city,
        "timezone": user.timezone_name
    }
    if include_price:
        data["lessonPriceRub"] = float(user.lesson_price_rub or 0)
    return data


def lesson_public(lesson, viewer_role, now=None):
    now = now or datetime.now(timezone.utc)
    data = {
        "id": lesson.id,
        "studentId": lesson.student_id,
        "studentName": f"{lesson.student.first_name} {lesson.student.last_name}",
        "subject": lesson.subject,
        "topic": lesson.topic,
        "startAt": iso(lesson.start_at),
        "durationMinutes": lesson.duration_minutes,
        "status": lesson.status,
        "originalStartAt": iso(lesson.original_start_at),
        "recurringScheduleId": lesson.recurring_schedule_id,
        "transferNote": lesson.transfer_note,
        "studentCity": lesson.student.city,
        "studentTimezone": lesson.student.timezone_name
    }

    if viewer_role == "tutor":
        data["meetingLink"] = lesson.meeting_link
        data["priceRub"] = float(lesson.price_rub or 0)
    else:
        seconds_left = (lesson.start_at - now).total_seconds()
        meeting_available = (-(lesson.duration_minutes * 60) <= seconds_left <= 300) and lesson.status in {"planned", "transferred"}
        data["meetingLink"] = lesson.meeting_link if meeting_available else ""
        data["meetingAvailable"] = meeting_available

    return data


def file_public(file_asset):
    if not file_asset:
        return None
    return {
        "id": file_asset.id,
        "name": file_asset.original_name,
        "sizeBytes": file_asset.size_bytes,
        "contentType": file_asset.content_type,
        "downloadUrl": f"/api/files/{file_asset.id}"
    }


def notification_public(item):
    try:
        payload = json.loads(item.payload_json or "{}")
    except Exception:
        payload = {}

    return {
        "id": item.id,
        "kind": item.kind,
        "title": item.title,
        "body": item.body,
        "link": item.link,
        "payload": payload,
        "isRead": item.is_read,
        "createdAt": iso(item.created_at)
    }
