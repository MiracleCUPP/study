from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..extensions import db
from ..models import Lesson, RecurringSchedule


def valid_timezone(name):
    try:
        ZoneInfo(str(name))
        return True
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return False


def local_datetime_to_utc(local_date, local_time, timezone_name):
    tz = ZoneInfo(timezone_name)
    if isinstance(local_date, str):
        local_date = date.fromisoformat(local_date)
    hour, minute = [int(part) for part in str(local_time).split(":", 1)]
    local_dt = datetime.combine(local_date, time(hour=hour, minute=minute), tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def format_local(dt, timezone_name):
    tz = ZoneInfo(timezone_name)
    return dt.astimezone(tz).strftime("%d.%m.%Y %H:%M")


def slot_is_free(start_at, duration_minutes, exclude_lesson_id=None):
    end_at = start_at + timedelta(minutes=duration_minutes)

    query = Lesson.query.filter(Lesson.status.in_(["planned", "transferred"]))
    if exclude_lesson_id:
        query = query.filter(Lesson.id != exclude_lesson_id)

    for lesson in query.all():
        lesson_end = lesson.start_at + timedelta(minutes=lesson.duration_minutes)
        if start_at < lesson_end and end_at > lesson.start_at:
            return False

    return True


def recurring_occurrence_dates(rule, through_date):
    current = max(rule.start_date, date.today())
    if current.weekday() != rule.weekday:
        current += timedelta(days=(rule.weekday - current.weekday()) % 7)

    last = through_date
    if rule.end_date and rule.end_date < last:
        last = rule.end_date

    while current <= last:
        yield current
        current += timedelta(days=7)


def generate_recurring_lessons(rule, through_date=None):
    if not rule.is_active:
        return 0

    through_date = through_date or (date.today() + timedelta(days=120))
    created = 0

    for local_date in recurring_occurrence_dates(rule, through_date):
        start_at = local_datetime_to_utc(local_date, rule.local_time, rule.timezone_name)

        exists = Lesson.query.filter_by(
            recurring_schedule_id=rule.id,
            original_start_at=start_at
        ).first()
        if exists:
            continue

        # A recurring series should never silently create a collision.
        if not slot_is_free(start_at, rule.duration_minutes):
            continue

        lesson = Lesson(
            student_id=rule.student_id,
            subject=rule.subject,
            topic=rule.topic,
            start_at=start_at,
            original_start_at=start_at,
            recurring_schedule_id=rule.id,
            duration_minutes=rule.duration_minutes,
            meeting_link=rule.meeting_link,
            status="planned",
            price_rub=rule.student.lesson_price_rub or 0
        )
        db.session.add(lesson)
        created += 1

    if created:
        db.session.commit()

    return created


def ensure_recurring_horizon(days=120):
    through_date = date.today() + timedelta(days=days)
    total = 0
    rules = RecurringSchedule.query.filter_by(is_active=True).all()
    for rule in rules:
        total += generate_recurring_lessons(rule, through_date)
    return total


def free_slots_for_local_date(local_date_text, viewer_timezone, duration_minutes=60,
                              tutor_timezone="Asia/Novosibirsk",
                              day_start="09:00", day_end="23:30",
                              exclude_lesson_id=None):
    viewer_tz = ZoneInfo(viewer_timezone)
    tutor_tz = ZoneInfo(tutor_timezone)
    viewer_date = date.fromisoformat(local_date_text)

    viewer_start = datetime.combine(viewer_date, time(0, 0), tzinfo=viewer_tz).astimezone(timezone.utc)
    viewer_end = viewer_start + timedelta(days=1)

    sh, sm = map(int, day_start.split(":"))
    eh, em = map(int, day_end.split(":"))

    result = []
    cursor = viewer_start - timedelta(hours=12)
    stop = viewer_end + timedelta(hours=12)

    while cursor < stop:
        local_viewer = cursor.astimezone(viewer_tz)
        local_tutor = cursor.astimezone(tutor_tz)
        within_viewer_day = local_viewer.date() == viewer_date
        tutor_minutes = local_tutor.hour * 60 + local_tutor.minute
        within_working = sh * 60 + sm <= tutor_minutes <= eh * 60 + em
        aligned = local_tutor.minute in {0, 30}

        if cursor <= datetime.now(timezone.utc):
            cursor += timedelta(minutes=30)
            continue

        if within_viewer_day and within_working and aligned and slot_is_free(
            cursor, duration_minutes, exclude_lesson_id=exclude_lesson_id
        ):
            result.append({
                "startAt": cursor.isoformat(),
                "viewerLabel": local_viewer.strftime("%H:%M"),
                "tutorLabel": local_tutor.strftime("%H:%M")
            })

        cursor += timedelta(minutes=30)

    seen = set()
    unique = []
    for item in result:
        key = item["startAt"]
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique
