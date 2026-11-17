from datetime import date, datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from flask import Blueprint, current_app, g, jsonify, request

from ..extensions import db
from ..models import Lesson, RecurringSchedule, TransferRequest, User
from ..security import login_required, student_required, tutor_required
from ..serializers import lesson_public
from ..services.notifications import create_notification
from ..services.schedule import (
    format_local,
    free_slots_for_local_date,
    local_datetime_to_utc,
    generate_recurring_lessons,
    slot_is_free,
    valid_timezone,
)

bp = Blueprint("lessons", __name__, url_prefix="/api")


def parse_datetime(value):
    if not value:
        return None
    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def tutor_user():
    return User.query.filter_by(role="tutor", is_active=True).first()


def schedule_change_notification(lesson, title="Расписание изменено", body_prefix="Занятие перенесено"):
    student_tz = lesson.student.timezone_name or "Asia/Novosibirsk"
    when = format_local(lesson.start_at, student_tz)
    create_notification(
        lesson.student_id,
        "schedule_changed",
        title,
        f"{body_prefix}: {when} ({lesson.student.city or student_tz}).",
        link="/student/schedule",
        payload={"lessonId": lesson.id, "startAt": lesson.start_at.isoformat()}
    )


@bp.get("/lessons")
@login_required
def list_lessons():
    query = Lesson.query
    if g.user.role == "student":
        query = query.filter_by(student_id=g.user.id)

    items = query.order_by(Lesson.start_at).all()
    now = datetime.now(timezone.utc)
    return jsonify([lesson_public(item, g.user.role, now=now) for item in items])


@bp.get("/schedule/availability")
@login_required
def availability():
    start_at = parse_datetime(request.args.get("startAt"))
    try:
        duration = int(request.args.get("durationMinutes", "60"))
    except Exception:
        duration = 60
    try:
        exclude = int(request.args.get("excludeLessonId")) if request.args.get("excludeLessonId") else None
    except Exception:
        exclude = None
    if not start_at:
        return jsonify({"error": "Некорректная дата"}), 400
    return jsonify({"available": slot_is_free(start_at, duration, exclude_lesson_id=exclude)})


@bp.get("/schedule/time-preview")
@tutor_required
def time_preview():
    student = db.session.get(User, request.args.get("studentId", type=int))
    local_date = str(request.args.get("date", "")).strip()
    local_time = str(request.args.get("time", "")).strip()
    if not student or student.role != "student":
        return jsonify({"error": "Ученик не найден"}), 404
    try:
        tutor_timezone = g.user.timezone_name or current_app.config["APP_TIMEZONE"]
        utc_dt = local_datetime_to_utc(local_date, local_time, tutor_timezone)
    except Exception:
        return jsonify({"error": "Некорректная дата или время"}), 400
    return jsonify({
        "startAt": utc_dt.isoformat(),
        "tutorTimezone": tutor_timezone,
        "tutorLabel": format_local(utc_dt, tutor_timezone),
        "studentTimezone": student.timezone_name,
        "studentCity": student.city,
        "studentLabel": format_local(utc_dt, student.timezone_name)
    })


@bp.get("/schedule/free-slots")
@login_required
def free_slots():
    date_text = str(request.args.get("date", "")).strip()
    try:
        date.fromisoformat(date_text)
    except Exception:
        return jsonify({"error": "Некорректная дата"}), 400

    try:
        duration = int(request.args.get("durationMinutes", "60"))
    except Exception:
        duration = 60
    try:
        exclude = int(request.args.get("excludeLessonId")) if request.args.get("excludeLessonId") else None
    except Exception:
        exclude = None

    viewer_timezone = g.user.timezone_name or current_app.config["APP_TIMEZONE"]
    tutor = tutor_user()
    tutor_timezone = (tutor.timezone_name if tutor else None) or current_app.config["APP_TIMEZONE"]

    return jsonify({
        "date": date_text,
        "viewerTimezone": viewer_timezone,
        "tutorTimezone": tutor_timezone,
        "slots": free_slots_for_local_date(
            date_text,
            viewer_timezone,
            duration_minutes=duration,
            tutor_timezone=tutor_timezone,
            exclude_lesson_id=exclude
        )
    })


@bp.get("/schedule/recurring")
@tutor_required
def list_recurring():
    items = RecurringSchedule.query.order_by(RecurringSchedule.weekday, RecurringSchedule.local_time).all()
    return jsonify([{
        "id": item.id,
        "studentId": item.student_id,
        "studentName": f"{item.student.first_name} {item.student.last_name}",
        "subject": item.subject,
        "topic": item.topic,
        "weekday": item.weekday,
        "localTime": item.local_time,
        "timezone": item.timezone_name,
        "durationMinutes": item.duration_minutes,
        "meetingLink": item.meeting_link,
        "startDate": item.start_date.isoformat(),
        "endDate": item.end_date.isoformat() if item.end_date else None,
        "isActive": item.is_active
    } for item in items])


@bp.post("/schedule/recurring")
@tutor_required
def create_recurring():
    data = request.get_json(silent=True) or {}
    student = db.session.get(User, data.get("studentId"))
    if not student or student.role != "student":
        return jsonify({"error": "Ученик не найден"}), 404

    try:
        weekday = int(data.get("weekday"))
        duration = int(data.get("durationMinutes", 60))
        start_date = date.fromisoformat(str(data.get("startDate")))
        end_date = date.fromisoformat(str(data.get("endDate"))) if data.get("endDate") else None
    except Exception:
        return jsonify({"error": "Проверьте день недели, дату и длительность"}), 400

    local_time = str(data.get("localTime", "")).strip()
    try:
        hour, minute = map(int, local_time.split(":"))
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError
    except Exception:
        return jsonify({"error": "Некорректное время"}), 400

    if weekday not in range(7):
        return jsonify({"error": "Некорректный день недели"}), 400
    if end_date and end_date < start_date:
        return jsonify({"error": "Дата окончания не может быть раньше начала"}), 400

    tutor_tz = g.user.timezone_name or current_app.config["APP_TIMEZONE"]
    if not valid_timezone(tutor_tz):
        tutor_tz = current_app.config["APP_TIMEZONE"]

    rule = RecurringSchedule(
        student_id=student.id,
        subject=str(data.get("subject", "Алгебра")).strip() or "Алгебра",
        topic=str(data.get("topic", "")).strip(),
        weekday=weekday,
        local_time=local_time,
        timezone_name=tutor_tz,
        duration_minutes=duration,
        meeting_link=str(data.get("meetingLink", "")).strip(),
        start_date=start_date,
        end_date=end_date,
        is_active=True
    )
    db.session.add(rule)
    db.session.commit()
    generated = generate_recurring_lessons(rule)

    create_notification(
        student.id,
        "schedule_changed",
        "Добавлено постоянное расписание",
        "Репетитор добавил еженедельное занятие. Проверьте календарь.",
        link="/student/schedule",
        dedupe_key=f"recurring-created-{rule.id}"
    )

    return jsonify({"id": rule.id, "generatedLessons": generated}), 201


@bp.patch("/schedule/recurring/<int:rule_id>")
@tutor_required
def update_recurring(rule_id):
    rule = db.session.get(RecurringSchedule, rule_id)
    if not rule:
        return jsonify({"error": "Постоянное расписание не найдено"}), 404
    data = request.get_json(silent=True) or {}

    regenerate = any(key in data for key in {
        "weekday", "localTime", "durationMinutes", "subject", "startDate", "endDate"
    })

    try:
        if "weekday" in data:
            weekday = int(data.get("weekday"))
            if weekday not in range(7):
                raise ValueError
            rule.weekday = weekday
        if "durationMinutes" in data:
            rule.duration_minutes = int(data.get("durationMinutes"))
        if "startDate" in data:
            rule.start_date = date.fromisoformat(str(data.get("startDate")))
        if "endDate" in data:
            rule.end_date = date.fromisoformat(str(data.get("endDate"))) if data.get("endDate") else None
    except Exception:
        return jsonify({"error": "Некорректные параметры постоянного расписания"}), 400

    if "localTime" in data:
        local_time = str(data.get("localTime", "")).strip()
        try:
            hour, minute = map(int, local_time.split(":"))
            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                raise ValueError
        except Exception:
            return jsonify({"error": "Некорректное время"}), 400
        rule.local_time = local_time

    if "subject" in data:
        rule.subject = str(data.get("subject", "")).strip() or rule.subject
    if "topic" in data:
        rule.topic = str(data.get("topic", "")).strip()
    if "meetingLink" in data:
        rule.meeting_link = str(data.get("meetingLink", "")).strip()
    if "isActive" in data:
        rule.is_active = bool(data.get("isActive"))

    if rule.end_date and rule.end_date < rule.start_date:
        return jsonify({"error": "Дата окончания не может быть раньше начала"}), 400

    if regenerate:
        now = datetime.now(timezone.utc)
        future = Lesson.query.filter(
            Lesson.recurring_schedule_id == rule.id,
            Lesson.start_at > now,
            Lesson.status == "planned"
        ).all()
        for lesson in future:
            if lesson.original_start_at and lesson.start_at == lesson.original_start_at:
                db.session.delete(lesson)

    db.session.commit()
    generated = generate_recurring_lessons(rule) if rule.is_active else 0

    create_notification(
        rule.student_id,
        "schedule_changed",
        "Постоянное расписание обновлено",
        "Репетитор изменил постоянное расписание. Проверьте календарь.",
        link="/student/schedule"
    )
    return jsonify({"ok": True, "generatedLessons": generated})


@bp.post("/lessons")
@tutor_required
def create_lesson():
    data = request.get_json(silent=True) or {}
    student = db.session.get(User, data.get("studentId"))
    if data.get("localDate") and data.get("localTime"):
        try:
            start_at = local_datetime_to_utc(data.get("localDate"), data.get("localTime"), g.user.timezone_name or current_app.config["APP_TIMEZONE"])
        except Exception:
            start_at = None
    else:
        start_at = parse_datetime(data.get("startAt"))
    if not student or student.role != "student":
        return jsonify({"error": "Ученик не найден"}), 404
    if not start_at:
        return jsonify({"error": "Укажите дату и время"}), 400
    try:
        duration = int(data.get("durationMinutes", 60))
    except Exception:
        duration = 60
    if not slot_is_free(start_at, duration):
        return jsonify({"error": "Это время уже занято"}), 409

    lesson = Lesson(
        student_id=student.id,
        subject=str(data.get("subject", "Алгебра")).strip() or "Алгебра",
        topic=str(data.get("topic", "")).strip(),
        start_at=start_at,
        original_start_at=start_at,
        duration_minutes=duration,
        meeting_link=str(data.get("meetingLink", "")).strip(),
        status="planned",
        price_rub=Decimal(student.lesson_price_rub or 0)
    )
    db.session.add(lesson)
    db.session.commit()
    schedule_change_notification(lesson, title="Новое занятие", body_prefix="Добавлено занятие")
    return jsonify(lesson_public(lesson, "tutor")), 201


@bp.patch("/lessons/<int:lesson_id>")
@tutor_required
def update_lesson(lesson_id):
    lesson = db.session.get(Lesson, lesson_id)
    if not lesson:
        return jsonify({"error": "Занятие не найдено"}), 404
    data = request.get_json(silent=True) or {}
    schedule_changed = False
    moved = False

    if "startAt" in data or (data.get("localDate") and data.get("localTime")):
        if data.get("localDate") and data.get("localTime"):
            try:
                start_at = local_datetime_to_utc(data.get("localDate"), data.get("localTime"), g.user.timezone_name or current_app.config["APP_TIMEZONE"])
            except Exception:
                start_at = None
        else:
            start_at = parse_datetime(data.get("startAt"))
        if not start_at:
            return jsonify({"error": "Некорректная дата"}), 400
        duration = int(data.get("durationMinutes", lesson.duration_minutes))
        if not slot_is_free(start_at, duration, exclude_lesson_id=lesson.id):
            return jsonify({"error": "Это время уже занято"}), 409
        if start_at != lesson.start_at:
            schedule_changed = True
            moved = True
            if lesson.original_start_at and start_at != lesson.original_start_at:
                lesson.status = "transferred"
        lesson.start_at = start_at
        lesson.duration_minutes = duration

    if "topic" in data:
        lesson.topic = str(data.get("topic", "")).strip()
    if "subject" in data:
        lesson.subject = str(data.get("subject", "")).strip() or lesson.subject
    if "meetingLink" in data:
        lesson.meeting_link = str(data.get("meetingLink", "")).strip()
    if "transferNote" in data:
        lesson.transfer_note = str(data.get("transferNote", "")).strip()

    if "status" in data:
        status = str(data.get("status"))
        if status not in {"planned", "completed", "cancelled", "transferred", "no_show"}:
            return jsonify({"error": "Некорректный статус"}), 400
        if moved and status == "planned":
            status = "transferred"
        if status != lesson.status:
            schedule_changed = True
        lesson.status = status

    db.session.commit()
    if schedule_changed:
        schedule_change_notification(lesson)
    return jsonify(lesson_public(lesson, "tutor"))


@bp.get("/transfers")
@login_required
def list_transfers():
    query = TransferRequest.query
    if g.user.role == "student":
        query = query.filter_by(student_id=g.user.id)
    items = query.order_by(TransferRequest.created_at.desc()).all()
    return jsonify([{
        "id": item.id,
        "lessonId": item.lesson_id,
        "studentId": item.student_id,
        "studentName": f"{item.student.first_name} {item.student.last_name}",
        "studentTimezone": item.student.timezone_name,
        "reason": item.reason,
        "originalStartAt": item.lesson.original_start_at.isoformat() if item.lesson.original_start_at else item.lesson.start_at.isoformat(),
        "requestedStartAt": item.requested_start_at.isoformat(),
        "status": item.status,
        "tutorComment": item.tutor_comment,
        "createdAt": item.created_at.isoformat()
    } for item in items])


@bp.post("/transfers")
@student_required
def create_transfer():
    data = request.get_json(silent=True) or {}
    lesson = db.session.get(Lesson, data.get("lessonId"))
    requested_start = parse_datetime(data.get("requestedStartAt"))
    reason = str(data.get("reason", "")).strip()
    if not lesson or lesson.student_id != g.user.id:
        return jsonify({"error": "Занятие не найдено"}), 404
    if not requested_start or not reason:
        return jsonify({"error": "Укажите причину, дату и время"}), 400
    if not slot_is_free(requested_start, lesson.duration_minutes, exclude_lesson_id=lesson.id):
        return jsonify({"error": "Это время уже занято"}), 409

    item = TransferRequest(
        lesson_id=lesson.id,
        student_id=g.user.id,
        reason=reason,
        requested_start_at=requested_start
    )
    db.session.add(item)
    db.session.commit()

    tutor = tutor_user()
    if tutor:
        when_student = format_local(requested_start, g.user.timezone_name)
        when_tutor = format_local(requested_start, tutor.timezone_name)
        create_notification(
            tutor.id,
            "transfer_requested",
            "Запрос на перенос",
            f"{g.user.first_name} {g.user.last_name}: {when_tutor} по вашему времени ({when_student} у ученика).",
            link="/tutor/transfers",
            dedupe_key=f"transfer-request-{item.id}"
        )
    return jsonify({"id": item.id, "status": item.status}), 201


@bp.patch("/transfers/<int:transfer_id>")
@tutor_required
def resolve_transfer(transfer_id):
    item = db.session.get(TransferRequest, transfer_id)
    if not item:
        return jsonify({"error": "Запрос не найден"}), 404
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).strip()
    comment = str(data.get("tutorComment", "")).strip()
    if status not in {"approved", "rejected"}:
        return jsonify({"error": "Некорректный статус"}), 400
    if item.status != "new":
        return jsonify({"error": "Запрос уже обработан"}), 409

    if status == "approved":
        if not slot_is_free(item.requested_start_at, item.lesson.duration_minutes, exclude_lesson_id=item.lesson.id):
            return jsonify({"error": "Выбранное время уже занято"}), 409
        item.lesson.start_at = item.requested_start_at
        item.lesson.status = "transferred"
        item.lesson.transfer_note = item.reason

    item.status = status
    item.tutor_comment = comment
    item.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    title = "Перенос подтверждён" if status == "approved" else "Перенос отклонён"
    if status == "approved":
        student_when = format_local(item.lesson.start_at, item.student.timezone_name)
        body = f"Новое время занятия: {student_when} ({item.student.city or item.student.timezone_name})."
    else:
        body = "Репетитор не подтвердил перенос занятия."
    create_notification(
        item.student_id,
        "transfer_result",
        title,
        body,
        link="/student/schedule",
        dedupe_key=f"transfer-result-{item.id}-{status}"
    )
    return jsonify({"status": item.status})
